(ns metabase-enterprise.advanced-config.caching
  (:require
   [compojure.core :refer [GET]]
   [java-time.api :as t]
   [metabase.api.common :as api]
   [metabase.api.routes.common :refer [+auth]]
   [metabase.public-settings.premium-features :refer [defenterprise]]
   [metabase.query-processor.middleware.cache-backend.db :as backend.db]
   [metabase.util.malli.schema :as ms]
   [toucan2.core :as t2])
  (:import
   (java.sql PreparedStatement Types)))

(set! *warn-on-reflection* true)

(defenterprise granular-ttl
  "Returns the granular cache ttl (in seconds) for a card. On EE, this first checking whether there is a stored value
   for the card, dashboard, or database (in that order of decreasing preference). Returns nil on OSS."
  :feature :cache-granular-controls
  [card dashboard database]
  (let [ttls              [(:cache_ttl card) (:cache_ttl dashboard) (:cache_ttl database)]
        most-granular-ttl (first (filter some? ttls))]
    (when most-granular-ttl ; stored TTLs are in hours; convert to seconds
      (* most-granular-ttl 3600))))

(defenterprise refreshable-states
  "States of `persisted_info` records which can be refreshed."
  :feature :cache-granular-controls
  []
  #{"creating" "persisted" "error"})

(defenterprise prunable-states
  "States of `persisted_info` records which can be pruned."
  :feature :cache-granular-controls
  []
  #{"deletable" "off"})

(defenterprise granular-cache-strategy
  "Returns the granular cache strategy for a card."
  :feature :cache-granular-controls
  [card dashboard-id]
  (let [qs     [{:from   [:cache_config]
                 :select [:id]
                 :where  [:and [:= :model "question"]   [:= :model_id (:id card)]]}
                {:from   [:cache_config]
                 :select [:id]
                 :where  [:and [:= :model "dashboard"]  [:= :model_id dashboard-id]]}
                {:from   [:cache_config]
                 :select [:id]
                 :where  [:and [:= :model "collection"] [:= :model_id (:collection_id card)]]}
                {:from   [:cache_config]
                 :select [:id]
                 :where  [:and [:= :model "database"]   [:= :model_id (:database_id card)]]}
                {:from   [:cache_config]
                 :select [:id]
                 :where  [:= :model "root"]}]
        q      {:select [:id]
                :limit  1
                :from   [[{:union-all qs} :unused_alias]]}
        config (t2/select-one :model/CacheConfig :id q)]
    (merge {:type (:strategy config)}
           (:config config)
           (:payload config))))

;;; Strategy execution

(defmulti prepare-statement-strategy*
  "Generate prepared statement for a db cache backend for a given strategy"
  (fn [strategy _conn _hash] (:type strategy)))

(defmethod prepare-statement-strategy* :ttl [strategy conn hash]
  (backend.db/prepare-statement-ttl strategy conn hash))

(let [q (backend.db/make-cached-q {:select   [:results]
                                   :from     [:query_cache]
                                   :where    [:and
                                              [:= :query_hash [:raw "?"]]
                                              [:>= :updated_at [:raw "?"]]]
                                   :order-by [[:updated_at :desc]]
                                   :limit    [:inline 1]})]
  (defmethod prepare-statement-strategy* :duration [strategy conn query-hash]
    (assert (:duration strategy))
    (assert (:unit strategy))
    (let [duration  (t/duration (:duration strategy) (keyword (:unit strategy)))
          timestamp (t/minus (t/offset-date-time) duration)]
      (backend.db/make-prepared-statement conn (q)
                                          (fn [^PreparedStatement stmt]
                                            (doto stmt
                                              (.setBytes 1 query-hash)
                                              (.setObject 2 timestamp Types/TIMESTAMP_WITH_TIMEZONE)))))))

(let [q (backend.db/make-cached-q {:select   [:results]
                                   :from     [:query_cache]
                                   :where    [:and
                                              [:= :query_hash [:raw "?"]]
                                              [:>= :updated_at [:raw "?"]]]
                                   :order-by [[:updated_at :desc]]
                                   :limit    [:inline 1]})]
  (defmethod prepare-statement-strategy* :schedule [strategy conn query-hash]
    (assert (:last-ran strategy))
    (backend.db/make-prepared-statement conn (q)
                                        (fn [^PreparedStatement stmt]
                                          (doto stmt
                                            (.setBytes 1 query-hash)
                                            (.setObject 2 (:last-ran strategy) Types/TIMESTAMP_WITH_TIMEZONE))))))

(let [q (backend.db/make-cached-q {:select   [:results]
                                   :from     [:query_cache]
                                   :where    [:and
                                              [:= :query_hash [:raw "?"]]
                                              [:= :mark [:raw "?"]]]
                                   :order-by [[:updated_at :desc]]
                                   :limit    [:inline 1]})]
  (defmethod prepare-statement-strategy* :query [strategy conn query-hash]
    (assert (:mark strategy))
    (backend.db/make-prepared-statement conn (q)
                                        (fn [^PreparedStatement stmt]
                                          (doto stmt
                                            (.setBytes 1 query-hash)
                                            (.setBytes 2 (:mark strategy)))))))

(defmethod prepare-statement-strategy* :nocache [_ _ _]
  nil)


(defenterprise prepare-statement-strategy
  "Returns prepared statement to query for db cache backend."
  :feature :cache-granular-controls
  [strategy conn hash]
  (prepare-statement-strategy* strategy conn hash))

;;; API

(api/defendpoint GET "/"
   "Return cache configuration."
  [:as {{:strs [model collection]
         :or   {model "root"}}
        :query-params}]
  {model      [:set {:decode/string (fn [x] (cond (set? x)    x
                                                  (vector? x) (set x)
                                                  (some? x)   #{x}))}
               [:enum "root" "database" "collection" "dashboard" "question"]]
   collection [:maybe ms/PositiveInt]}

  (let [model (cond-> model
                (some #{"dashboard" "question"} model) (conj "collection"))
        opts  [:model [:in model]
               :collection_id collection]
        items (apply t2/select :model/CacheConfig opts)]
    {:items items}))

(api/defendpoint PUT "/"
  "Store cache configuration."
  [:as {{:keys [model model_id strategy]} :body}]
  {model    [:enum "root" "database" "collection" "dashboard" "question"]
   model_id ms/IntGreaterThanOrEqualToZero
   strategy [:and
             [:map
              [:type [:enum :nocache :ttl :duration :schedule :query]]]
             [:multi {:dispatch :type}
              [:nocache  [:map]]
              [:ttl      [:map
                          [:multiplier ms/PositiveInt]
                          [:min_duration ms/PositiveInt]]]
              [:duration [:map
                          [:duration ms/PositiveInt]
                          [:unit [:enum "hours" "minutes" "seconds" "days"]]]]
              [:schedule [:map
                          [:schedule string?]]]
              [:query    [:map
                          [:schedule string?]
                          [:column string?]
                          [:aggregation [:enum "max" "count"]]]]]]}
  (when (and (= model "root") (not= model_id 0))
    (throw (ex-info "Root configuration is only valid with model_id = 0" {:status-code 400
                                                                          :model_id    model_id})))
  (let [entity (when-not (= model "root")
                 (api/check-404 (t2/select-one (case model
                                                 "database"   :model/Database
                                                 "collection" :model/Collection
                                                 "dashboard"  :model/Dashboard
                                                 "question"   :model/Card)
                                               :id model_id)))
        cid    (if (= model "collection")
                 (:parent_id #p (t2/hydrate entity :parent_id))
                 (:collection_id entity))
        data   {:model         model
                :model_id      model_id
                :collection_id cid
                :updated_at    (t/offset-date-time)
                :strategy      (:type strategy)
                :config        (dissoc strategy :type)}]
    (or (pos? (t2/update! :model/CacheConfig {:model model :model_id model_id} data))
        (t2/insert-returning-instances! :model/CacheConfig data))
    {:status 204
     :body   ""}))

(api/defendpoint DELETE "/"
  [:as {{:keys [model model_id]} :body}]
  {model    [:enum "root" "database" "collection" "dashboard" "question"]
   model_id ms/PositiveInt}
  (when (and (= model "root") (not= model_id 0))
    (throw (ex-info "Root configuration is only valid with model_id = 0" {:status-code 400
                                                                          :model_id model_id})))
  (t2/delete! :model/CacheConfig {:model model :model_id model_id})
  {:status 204})

(api/define-routes +auth)
