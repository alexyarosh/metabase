(ns metabase.db.util-test
  (:require
   [clojure.test :refer [deftest testing is]]
   [metabase.db.util :as mdb.u]
   [metabase.models.setting :refer [Setting]]
   [toucan2.core :as t2]))

(set! *warn-on-reflection* true)

(deftest idempotent-insert!-test
  ;; We test both a case where the database protects against duplicates, and where it does not.
  ;; Using Setting is perfect because it has only two required fields - (the primary) key & value (with no constraint).
  ;;
  ;; In the `:key` case using the `idempotent-insert!` rather than an `or` prevents the from application throwing an
  ;; exception when there are race conditions. For `:value` it prevents us silently inserting duplicates.
  ;;
  ;; It's important to test both, as only the latter has a phantom read issue and thus requires serializable isolation.
  (let [columns [:key :value]]
    (doseq [search-col columns]
      (testing (format "Testing idempotent insertion where the search column %s a uniqueness constraint in the db"
                       (if (= :key search-col) "has" "does not have"))

        ;; We cannot use with-temp, as it starts its own transaction, which stops us setting the isolation level.
        (let [search-value (str (random-uuid))
              other-col    (first (remove #{search-col} columns))]
          (try
            ;; ensure there is no database detritus
            (t2/delete! Setting search-col search-value)

            (let [threads  5
                  promises (atom [])
                  thunk    (fn []
                             (mdb.u/idempotent-insert!
                               (t2/select-one-pk Setting search-col search-value)
                               ;; Pause to ensure multiple threads hit the mutating path
                               (do (Thread/sleep 300)
                                   (t2/insert-returning-pk! Setting
                                                            search-col search-value
                                                            other-col (str (random-uuid))))))]

              ;; hit it
              (dotimes [_ threads]
                (swap! promises conj (future (thunk))))

              (let [result-keys (mapv deref @promises)
                    latest-key  (t2/select-one-pk Setting search-col search-value)]

                (testing "Every call returns the same row"
                  (is (= (repeat threads latest-key) result-keys)))

                (testing "We have not inserted any duplicates"
                  (is (= 1 (count (t2/select Setting search-col search-value)))))

                (testing "Later calls will just return the existing row as well"
                  (is (= latest-key (thunk)))
                  (is (= 1 (count (t2/select Setting search-col search-value)))))))

            ;; Since we couldn't use with-temp, we need to clean up manually.
            (finally
              (t2/delete! Setting search-col search-value))))))))
