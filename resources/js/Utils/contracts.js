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
 * @property {string} cartItemId - Unique identifier (product.id + '-' + metadata.type).
 * @property {string} product_id - The ID of the product for backend sync.
 * @property {string} name - Display name of the item.
 * @property {number} quantity - The amount of units/shots.
 * @property {number} unit_price - The price per individual unit/shot/bottle.
 * @property {number} subtotal - The calculated line total (unit_price * quantity).
 * @property {Object|null} metadata - Data regarding the type (e.g., { type: 'shot' }).
 * @property {string|null} orderable_id - Reserved for backend polymorphic relation.
 * @property {string|null} orderable_type - Reserved for backend polymorphic relation.
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} product_id
 * @property {string} name
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} subtotal
 * @property {Object} metadata
 */

export const CartItem = {};
export const OrderItem = {};

export const Unit = {};
export const BottleSpecs = {};
export const Product = {};
export const Category = {};
export const ShotSize = {};
