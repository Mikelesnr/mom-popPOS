/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {number} conversion_rate
 */

/**
 * @typedef {Object} BottleSpecs
 * @property {boolean} is_weighable
 * @property {number} capacity_ml
 * @property {number} tare_weight_g
 * @property {number} gross_weight_g
 * @property {number|null} bottle_selling_price
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} cost_price
 * @property {number} selling_price
 * @property {boolean} is_perishable
 * @property {Unit|null} unit
 * @property {BottleSpecs|null} bottle_specs
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {Product[]} products
 */

/**
 * @typedef {Object} ShotSize
 * @property {string} id
 * @property {string} name
 * @property {number} size_ml
 */

/**
 * @typedef {Object} CartItem
 * @property {string} cartId - Unique identifier for cart line (product + type).
 * @property {string} id - Product ID (for backend sync).
 * @property {string} name - Display name (e.g., "Johnnie Walker (Single)").
 * @property {number} pricePerUnit - Price per unit/shot/bottle.
 * @property {number} quantity - Fractional deduction (e.g., 0.04 for a shot).
 * @property {number} totalLinePrice - Total price for this cart line.
 * @property {Object|null} baseData - Metadata (e.g., { type: 'shot', shot_size_id: 'uuid' }).
 */

export const Unit = {};
export const BottleSpecs = {};
export const Product = {};
export const Category = {};
export const ShotSize = {};
export const CartItem = {};
