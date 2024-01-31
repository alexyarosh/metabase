(ns metabase.query-processor.middleware.cache-backend.db
  (:require
   [clojure.math :as math]
   [java-time.api :as t]
   [metabase.db :as mdb]
   [metabase.db.query :as mdb.query]
   [metabase.models.query-cache :refer [QueryCache]]
   [metabase.public-settings.premium-features :refer [defenterprise]]
   [metabase.query-processor.middleware.cache-backend.interface :as i]
   [metabase.util.date-2 :as u.date]
   [metabase.util.i18n :refer [trs]]
   [metabase.util.log :as log]
   [toucan2.connection :as t2.connection]
   #_{:clj-kondo/ignore [:discouraged-namespace]}
   [toucan2.core :as t2])
  (:import
   (java.sql Connection PreparedStatement ResultSet Types)))

(set! *warn-on-reflection* true)

(defn- seconds-ago [n]
  (let [[unit n] (if-not (integer? n)
                   [:millisecond (long (* 1000 n))]
                   [:second n])]
    (u.date/add (t/offset-date-time) unit (- n))))

(defn make-cached-q
  "Function returning memoized compiled SQL query (varies on db type)"
  [q]
  ;; this is memoized for a given application DB so we can deliver cached results EXTRA FAST and not have to spend an
  ;; extra microsecond compiling the same exact query every time. :shrug:
  ;;
  ;; Since application DB can change at run time (during tests) it's not just a plain delay
  (let [f (memoize (fn [_db-type]
                     (first (mdb.query/compile q))))]
    (fn []
      (f (mdb/db-type)))))

(defn make-prepared-statement
  "Create a prepared statement for a cache querying purposes"
  ^PreparedStatement [^Connection conn q set-args]
  (let [stmt (.prepareStatement conn ^String q
                                ResultSet/TYPE_FORWARD_ONLY
                                ResultSet/CONCUR_READ_ONLY
                                ResultSet/CLOSE_CURSORS_AT_COMMIT)]
    (try
      (doto stmt
        (.setFetchDirection ResultSet/FETCH_FORWARD)
        (.setMaxRows 1)
        set-args)
      (catch Throwable e
        (log/error e "Error preparing statement to fetch cached query results")
        (.close stmt)
        (throw e)))))

(def ^:private cached-results-ttl-q
  (make-cached-q {:select   [:results]
                  :from     [:query_cache]
                  :where    [:and
                             [:= :query_hash [:raw "?"]]
                             [:>= :updated_at [:raw "?"]]]
                  :order-by [[:updated_at :desc]]
                  :limit    [:inline 1]}))


(defn prepare-statement-ttl
  "Make a prepared statement for :ttl caching strategy"
  ^PreparedStatement [strategy ^Connection conn query-hash]
  (if-not (= :ttl (:type strategy))
    (throw (ex-info "Not sure what to do" {:strategy strategy}))
    (let [max-age-seconds (math/round (/ (* (:ttl strategy)
                                            (:execution-time strategy))
                                         1000.0))]
      (make-prepared-statement conn (cached-results-ttl-q)
                               (fn [^PreparedStatement stmt]
                                 (doto stmt
                                   (.setBytes 1 query-hash)
                                   (.setObject 2 (seconds-ago max-age-seconds) Types/TIMESTAMP_WITH_TIMEZONE)))))))

(defenterprise prepare-statement-strategy
  "Returns prepared statement for a given strategy and query hash - on EE. Returns nil on OSS."
  metabase-enterprise.advanced-config.caching
  [_strategy _conn _hash])

(defn- prepare-statement ^PreparedStatement [strategy conn hash]
  (or (prepare-statement-strategy strategy conn hash)
      (prepare-statement-ttl strategy conn hash)))

(defn- cached-results [query-hash strategy respond]
  ;; VERY IMPORTANT! Open up a connection (which internally binds [[toucan2.connection/*current-connectable*]] so it
  ;; will get reused elsewhere for the duration of results reduction, otherwise we can potentially end up deadlocking if
  ;; we need to acquire another connection for one reason or another, such as recording QueryExecutions
  (t2/with-connection [conn]
    (with-open [stmt (prepare-statement strategy conn query-hash)
                rs   (.executeQuery stmt)]
      (assert (= t2.connection/*current-connectable* conn))
      (if-not (.next rs)
        (respond nil)
        (with-open [is (.getBinaryStream rs 1)]
          (respond is))))))

(defn- purge-old-cache-entries!
  "Delete any cache entries that are older than the global max age `max-cache-entry-age-seconds` (currently 3 months)."
  [max-age-seconds]
  {:pre [(number? max-age-seconds)]}
  (log/tracef "Purging old cache entries.")
  (try
    (t2/delete! (t2/table-name QueryCache)
                :updated_at [:<= (seconds-ago max-age-seconds)])
    (catch Throwable e
      (log/error e (trs "Error purging old cache entries"))))
  nil)

(defn- save-results!
  "Save the `results` of query with `query-hash`, updating an existing QueryCache entry if one already exists, otherwise
  creating a new entry."
  [^bytes query-hash ^bytes results opts]
  (log/debug (trs "Caching results for query with hash {0}." (pr-str (i/short-hex-hash query-hash))))
  (try
    (or (pos? (t2/update! QueryCache {:query_hash query-hash}
                          {:updated_at (t/offset-date-time)
                           :results    results
                           :mark       (:mark opts)}))
        (first (t2/insert-returning-instances! QueryCache
                                               :updated_at (t/offset-date-time)
                                               :query_hash query-hash
                                               :results    results
                                               :mark       (:mark opts))))
    (catch Throwable e
      (log/error e (trs "Error saving query results to cache."))))
  nil)

(defmethod i/cache-backend :db
  [_]
  (reify i/CacheBackend
    (cached-results [_ query-hash strategy respond]
      (cached-results query-hash strategy respond))

    (save-results! [_ query-hash is opts]
      (save-results! query-hash is opts)
      nil)

    (purge-old-entries! [_ max-age-seconds]
      (purge-old-cache-entries! max-age-seconds))))
