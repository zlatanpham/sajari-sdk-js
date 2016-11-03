/**
 * @fileOverview Exports the Sajari javascript api.
 * @name sajari.js
 * @author Sajari
 * @license MIT
 * @module sajari
 */
import { getGAID } from './utils'

/** Class representing an instance of the Api. Handles the searching of queries and keeping track of query id and sequence */
export class Api {

  /**
   * Creates an Api object.
   * @constructor
   * @param {string} project The project name.
   * @param {string} collection The collection name.
   * @param {string} [endpoint] A custom endpoint to send searches.
   * @returns {Api} Api object.
   */
  constructor(project, collection, endpoint) {
    /** @private */
    this.p = project;
    /** @private */
    this.c = collection;
    /** @private */
    this.a = endpoint || 'https://api.sajari.com:9200/search/';
  }

  /**
   * Performs a search
   * @param {Query} query The query object to perform a search with.
   * @param {function(err: string, res: Object)} callback The callback to call when a response is received.
   * @returns {Promise} A promise of the search.
   */
  search(query, callback) {
    return fetch(this.a, {
      method: 'POST',
      body: JSON.stringify({
        searchRequest: {
          searchRequest: query.q,
          // eslint-disable-next-line no-param-reassign
          tracking: {
            type: query.generate_tokens,
            field: query.token_key_field,
            sequence: query.s++, // Increment query sequence
            query_id: query.i,
            data: query.data,
          },
        },
        project: this.p,
        collection: this.c,
      })
    }).then((res) => {
      if (res.ok) {
        res.json().then((json) => {
          // Flatten single value / multiple values proto structure
          const r = json.searchResponse.results || []; // Some queries do not have results
          for (let i = 0; i < r.length; i++) {
            for (let f in r[i].values) {
              r[i].values[f] = r[i].values[f].single !== undefined ? r[i].values[f].single : r[i].values[f].repeated.values;
            }
            // Copy tokens into results
            if (json.tokens) {
              r[i].tokens = json.tokens[i];
            }
          }
          // Return searchResponse
          callback(null, json)
        })
      } else {
        res.text().then((errMsg) => callback(errMsg, null));
      }
    }).catch((err) => callback('Error during fetch: ' + err.message, null));
  }
}

/**
 * @typedef {Object} Body
 * @property {string} text The text of the Body.
 * @property {number} weight The weight of the Body.
 */

/**
 * Creates a body object
 * @param {string} text The text to use for the body.
 * @param {number} [weight=1] The weight to give the body.
 * @returns {Body} A body object.
 */
export function body(text, weight) {
  return { text, weight: weight || 1 };
}

/** @typedef {string} MetricType */

/** @returns MetricType */
export const METRIC_TYPE_MAX = 'MAX';
/** @returns MetricType */
export const METRIC_TYPE_MIN = 'MIN';
/** @returns MetricType */
export const METRIC_TYPE_AVG = 'AVG';
/** @returns MetricType */
export const METRIC_TYPE_SUM = 'SUM';

/** @typedef {Object} Aggregate */
/** @typedef {string} Field */

/**
 * Creates a Metric Aggregate Object.
 * @param {string} name The name of the aggregate.
 * @param {Field} field The field to aggregate.
 * @param {MetricType} type The type of metric to gather.
 * @returns {Aggregate} A Metric Aggregate Object
 */
export function metricAggregate(name, field, type) {
  return [name, { metric: { field, type } }];
}

/**
 * Creates a Count Aggregate Object.
 * @param {string} name The name of the aggregate.
 * @param {Field} field The field to aggregate.
 * @returns {Aggregate} A Count Aggregate Object.
 */
export function countAggregate(name, field) {
  return [name, { count: { field } }];
}

/**
 * @typedef {Object} Bucket
 * @property {string} name The name of the bucket.
 * @property {Filter} filter The filter to use as the classifier.
 */

/**
 * Creates a Bucket object.
 * @param {string} name The name of the bucket.
 * @param {Filter} filter The filter fo use as the classifier.
 * @returns {Bucket} The bucket object.
 */
export function bucket(name, filter) {
  return { name, filter };
}

/**
 * Creates a Bucket Aggregate Object.
 * @param {string} name The name of the Bucket Aggregate.
 * @param {bucket[]} buckets The buckets to use.
 * @returns {Aggregate}
 */
export function bucketAggregate(name, buckets) {
  return [name, { bucket: { buckets } }];
}

function protoValue(values) {
  if (values instanceof Array) {
    return { repeated: { values: values.map(String) } }
  }
  if (values === null) {
    return value = { null: true }
  }
  return { single: String(values) }
}

function operatorFromString(operator) {
  switch (operator) {
  case '=':
    return 'EQUAL_TO'
  case '!=':
    return 'NOT_EQUAL_TO'
  case '>':
    return 'GREATER_THAN'
  case '>=':
    return 'GREATER_THAN_OR_EQUAL_TO'
  case '<':
    return 'LESS_THAN'
  case '<=':
    return 'LESS_THAN_OR_EQUAL_TO'
  case '~':
    return 'CONTAINS'
  case '!~':
    return 'DOES_NOT_CONTAIN'
  case '^':
    return 'HAS_PREFIX'
  case '$':
    return 'HAS_SUFFIX'
  default:
    throw `invalid operator: ${operator}`
  }
}

/**
 * @typedef {Object} Filter
 */

/**
 * Create a Field Filter.
 *
 * | Operator     | Description           |
 * | :-:          | :--                   |
 * | `=`          | Equal to              |
 * | `!=`         | Not equal to          |
 * | `>`          | Greater than          |
 * | `>=`         | Greater than or equal to |
 * | `<`          | Less than             |
 * | `<=`         | Less than or equal to |
 * | `~`          | Contains              |
 * | `!~`         | Does not contain      |
 * | `^`          | Has prefix            |
 * | `$`          | Has suffix            |
 *
 * @param {Field} field The field to filter on.
 * @param {string} operator The operator to use.
 * @param {*} values The value(s) to compare against.
 * @returns {Filter} Field filter object.
 */
export function fieldFilter(field, operator, values) {
  return { field: { field, value: protoValue(values), operator: operatorFromString(operator) } };
}

/**
 * Creates a Geo Filter.
 * @param {Field} field_lat The field containing the latitude value.
 * @param {Field} field_lng The field containing the longitude value.
 * @param {number} lat The latitude to compare against.
 * @param {number} lng The longitude to compare against.
 * @param {radius} radius The radius to restrict the filter to.
 * @param {GeoRegion} region The region to restrict the filter to.
 * @returns {Filter}
 */
export function geoFilter(field_lat, field_lng, lat, lng, radius, region) {
  return { geo: { field_lat, field_lng, lat, lng, radius, region } };
}

function combinatorFilter(filters, operator) {
  return { combinator: { filters, operator } };
}

/**
 * Creates an All Filter. An All filter will resolve to True only if all it's child filters resolve to True.
 * @param {Filter[]} filters The child filters.
 * @returns {Filter}
 */
export function allFilters(filters) {
  return combinatorFilter(filters, 'ALL')
}

/**
 * Creates an Any Filter. An Any filter will resolve to True if at least one of it's child filters resolve to True.
 * @param {Filter[]} filters The child filters.
 * @returns {Filter}
 */
export function anyFilters(filters) {
  return combinatorFilter(filters, 'ANY')
}

/**
 * Creates a One Of Filter. A One Of filter will resolve to True only if exactly one of it's child filters resolve to True.
 * @param {Filter[]} filters The child filters.
 * @returns {Filter}
 */
export function oneOfFilters(filters) {
  return combinatorFilter(filters, 'ONE')
}

/**
 * Creates a None Of Filter. A None Of filter will resolve to True only if none of it's child filters resolve to True.
 * @param {Filter[]} filters The child filters.
 * @returns {Filter}
 */
export function noneOfFilters(filters) {
  return combinatorFilter(filters, 'NONE')
}

/** @typedef {Object} InstanceBoost */

/**
 * Creates a Field Instance Boost. FilterFieldBoost is a boost which is applied to documents which satisfy the filter. Value must be greater than 0. Documents which match the filter will receive a boost of Value.
 * @param {Field} field The field to boost.
 * @param {number} value The value to boost by.
 * @returns {InstanceBoost}
 */
export function fieldInstanceBoost(field, value) {
  return { field: { field, value } };
}

/**
 * Creates a Score Instance Boost. ScoreInstanceBoost is a boost applied to index terms which have interaction data set. For an instance score boost to take effect, the instance must have received at least minCount score updates (i.e. count). If an item is performing as it should then its score will be 1. If the score is below threshold (0 < threshold < 1) then the score will be applied.
 * @param {number} threshold
 * @param {number} min_count
 * @returns {InstanceBoost}
 */
export function scoreInstanceBoost(threshold, min_count) {
  return { score: { threshold, min_count } };
}

/** @typedef {Object} FieldBoost */

/**
 * Creates a Filter Field Boost. FilterFieldBoost is a boost which is applied to documents which satisfy the filter. Value must be greater than 0. Documents which match the filter will receive a boost of Value
 * @param {Filter} filter The Filter to use as the condition for the boost.
 * @param {number} value The value to give the boost.
 * @returns {FieldBoost}
 */
export function filterFieldBoost(filter, value) {
  return { filter: { filter, value } };
}

/**
 * Creates an Additive Field Boost for a Field Boost. AdditiveFieldBoost uses the normalised form of the FieldBoost b (computed internally) to count for a portion (value between 0 and 1) of the overall document score.
 * @param {FieldBoost} field_boost The field boost to make additive.
 * @param {number} value The percentage to attribute to this additive boost.
 * @returns {FieldBoost}
 */
export function additiveFieldBoost(field_boost, value) {
  return { additive: { field_boost, value } };
}

/** @typedef {string} GeoRegion */

/** @returns {GeoRegion} */
export const GEO_FIELD_BOOST_REGION_INSIDE = 'INSIDE';
/** @returns {GeoRegion} */
export const GEO_FIELD_BOOST_REGION_OUTSIDE = 'OUTSIDE';

/** @typedef {Object} PointValue */

/**
 * Creates a Point Value for use in an Interval Field Boost.
 * @param {number} point A point to scale from/to.
 * @param {number} value The value to give at this point.
 * @returns {PointValue}
 */
export function pointValue(point, value) {
  return { point, value };
}

/**
 * Creates an Interval Field Boost. IntervalFieldBoost represents an interval-based boost for numeric field values. An interval field boost is defined by a list of points with corresponding boost values. When a field value falls between between two PointValues.Point values is computed linearly.
 * @param {Field} field The field to boost.
 * @param {PointValue[]} points The points to use as intervals.
 * @returns {FieldBoost}
 */
export function intervalFieldBoost(field, points) {
  return { interval: { field, points } };
}

/**
 * Creates a Distance Field Boost. DistanceFieldBoost is a distance-based boost for numeric field values.
 * @param {number} min The minimum value to start boosting at.
 * @param {number} max The maximum value to finish boosting at.
 * @param {number} ref The value in the range to get the full `value` of boost.
 * @param {Field} field The field to boost on.
 * @param {number} value The boost value to give.
 * @returns {FieldBoost}
 */
export function distanceFieldBoost(min, max, ref, field, value) {
  return { distance: { min, max, ref, field, value } };
}

/**
 * Creates an Element Field Boost. ElementFieldBoost represents an element-based boosting for repeated field values. The resulting boost is the proportion of elements in elts that are also in the field value.
 * @param {Field} field The field to boost on.
 * @param {string[]} elts The elements to use for the boost.
 * @returns {FieldBoost}
 */
export function elementFieldBoost(field, elts) {
  return { element: { field, elts } };
}

/**
 * TextFieldBoost represents a text-based boosting for string fields. It compares the text gainst the document field using a bag-of-words model.
 * @param {Field} field The field to boost on.
 * @param {string} text The text to use for the boost.
 * @returns {FieldBoost}
 */
export function textFieldBoost(field, text) {
  return { text: { field, text } };
}

/** @typedef {Object} FeatureFieldBoost */

/**
 * Creates a FeatureFieldBoost from a FieldBoost
 * @param {FieldBoost} field_boost
 * @param {number} value
 * @returns {FeatureFieldBoost} FeatureFieldBoost object.
 */
export function featureFieldBoost(field_boost, value) {
  return { field_boost , value }
}

/** @typedef {Object} Sort */

/**
 * Creates a Sort object. Sort defines a sort order for a query.
 * @param {Field} field The field to sort by, prepended by `-` if it should be descending.
 * @returns {Sort}
 */
export function sort(field) {
  return { field, order: field[0] === '-' ? 'DESC' : 'ASC' };
}

/** @typedef {string} Transform

/**
 * Creates a transform. Transform is a definition of a transformation applied to a Request which is applied before the Request is executed.
 * @param {string} identifier The name of the Transform to be applied.]
 * @returns {Transform}
 */
export function transform(identifier) {
  return { identifier };
}

/** Class representing a IndexQuery */
export class IndexQuery {

  /**
   * Creates a IndexQuery Object.
   * @constructor
   * @returns {IndexQuery} IndexQuery Object.
   */
  constructor() {}

  /**
   * Sets the body of a query. Body is a list of weighted free-text.
   * @param {Body[]} bodies A list of body objects
   */
  body(bodies) {
    this.body = bodies
  }

  /**
   * Sets a list of InstanceBoost for the IndexQuery.
   * @param {InstanceBoost[]} boosts The InstanceBoosts to be applied to the IndexQuery.
   */
  instanceBoosts(boosts) {
    this.instance_boosts = boosts
  }

  /**
   * Sets a list of FieldBoost for the IndexQuery.
   * @param {FieldBoost[]} boosts The FieldBoosts to be applied to the IndexQuery.
   */
  fieldBoosts(boosts) {
    this.field_boosts = boosts;
  }
}

/** Class representing a FeatureQuery */
export class FeatureQuery {

  /**
   * Creates a FeatureQuery Object.
   * @constructor
   * @returns {FeatureQuery} FeatureQuery Obejct.
   */
  constructor() {}

  /**
   * Sets the FieldBoosts on the FeatureQuery.
   * @param {FeatureFieldBoost[]} boosts The FeatureFieldBoosts to apply to the FeatureQuery.
   */
  fieldBoosts(boosts) {
    this.field_boosts = boosts
  }
}

/** Class representing a Query. */
export class Query {

  /**
   * Creates a Query object.
   * @constructor
   * @returns {Object} Query object.
   */
  constructor() {
    this.resetID();
    /** @private */
    this.q = {
      limit: 10,
    };
    /** @private */
    this.data = {} // tracking data
    const gaID = getGAID()
    if (gaID) {
      this.tracking('gaID', gaID)
    }
  }

  /**
   * Sets a Filter for the Query.
   * @param {Filter} filter The Filter to be applied to the Query.
   */
  filter(filter) {
    this.q.filter = filter
  }

  /**
   * Applies the IndexQuery to the Query
   * @param {IndexQuery} query
   */
  indexQuery(query) {
    this.q.index_query = query
  }

  /**
   * Applies the FeatureQuery to the Query
   * @param {FeatureQuery} query
   */
  featureQuery(query) {
    this.q.feature_query = query
  }

  /**
   * Sets the offset on the Query.
   * @param {number} offset The offset to use.
   */
  offset(offset) {
    this.q.offset = offset
  }

  /**
   * Sets the limit on the Query. This determines the maximum number of results each search will return.
   * @param {number} limit The maximum number of results to return per search.
   */
  limit(limit) {
    this.q.limit = limit
  }

  /**
   * Sets a list of Fields to be returned.
   * @param {Field[]} fields The Fields to be returned from a search.
   */
  fields(fields) {
    this.q.fields = fields
  }

  /**
   * Sets the Sorts on a Query.
   * @param {Sort[]} sorts The Sorts to be applied in order to the Query.
   */
  sort(sorts) {
    this.q.sort = sorts
  }

  /**
   * Sets the Aggregates on a query. Aggregates is a set of Aggregates to run against a result set.
   * @param {Aggregate[]} aggregates The list of Aggregates.
   */
  aggregates(aggregates) {
    const newAggregates = {};
    for (let i = 0; i < aggregates.length; i++) {
      newAggregates[aggregates[i][0]] = aggregates[i][1]
    }
    this.q.aggregates = newAggregates
  }

  /**
   * Sets the Transforms on a Query.
   * @param {Transform[]} transforms The Transforms to be applied to the Query.
   */
  transforms(transforms) {
    this.q.transforms = transforms
  }

  /**
   * Resets tracking ID on the Query object.
   */
  resetID() {
    /** @private */
    this.i = ''
    /** @private */
    this.s = 0

    // Generate a random id for the query
    for (let i = 0; i < 16; i++) {
      this.i += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))
    }
  }

  /**
   * Sets pos neg tracking token field and enables click tracking
   * @param {Field} field The Field to apply pos neg tracking to.
   */
  posNegTracking(field) {
    /** @private */
    this.generate_tokens = 'POS_NEG'
    /** @private */
    this.token_key_field = field
  }

  /**
   * Sets click tracking token field and enables pos neg tracking
   * @param {Field} field The Field to apply click tracking to.
   */
  clickTracking(field) {
    this.generate_tokens = 'CLICK'
    this.token_key_field = field
  }

  /**
   * Set tracking data in a key value stre to be sent with the Query.
   * @param {string} name The name of the custom tracking data
   * @param {string} value The value of the custom tracking data
   */
  tracking(name, value) {
    this.data[name] = value
  }
}
