// Every module and feature in the software. Key format: "<module>.<feature>".
// Never end a key with "manage" (CASL reads it as "any action").
// staffToday: true  = staff can already do this today, so the legacy staff role gets it.
const catalog = {
  restaurant: {
    label: "Restaurant",
    features: {
      "restaurant.view": { label: "View profile", staffToday: true },
      "restaurant.edit": { label: "Edit name, address, phone" },
      "restaurant.branding": { label: "Logo and branding" },
      "restaurant.gst": { label: "GST and tax settings" },
      "restaurant.status": { label: "Open or close restaurant" },
    },
  },
  menu: {
    label: "Menu",
    features: {
      "menu.view": { label: "View menu", staffToday: true },
      "menu.create": { label: "Add menu item" },
      "menu.edit": { label: "Edit menu item" },
      "menu.delete": { label: "Delete menu item" },
      "menu.reorder": { label: "Reorder menu items" },
      "menu.variants": { label: "Variants" },
      "menu.combos": { label: "Combos" },
      "menu.discounts": { label: "Discounts" },
      "menu.images": { label: "Item images" },
      "menu.category.create": { label: "Add category" },
      "menu.category.edit": { label: "Edit category" },
      "menu.category.delete": { label: "Delete category" },
      "menu.category.reorder": { label: "Reorder categories" },
    },
  },
  table: {
    label: "Tables",
    features: {
      "table.view": { label: "Live table status", staffToday: true },
      "table.create": { label: "Create tables" },
      "table.edit": { label: "Edit, activate or deactivate tables" },
      "table.delete": { label: "Delete tables" },
      "table.qr": { label: "Table QR codes" },
    },
  },
  room: {
    label: "Rooms",
    features: {
      "room.view": { label: "Live room status", staffToday: true },
      "room.create": { label: "Create rooms" },
      "room.edit": { label: "Edit, activate or deactivate rooms" },
      "room.delete": { label: "Delete rooms" },
      "room.pricing": { label: "Room categories and price per night" },
      "room.qr": { label: "Room QR codes" },
      "room.booking.create": { label: "Book a room", staffToday: true },
      "room.booking.cancel": { label: "Cancel a room booking", staffToday: true },
    },
  },
  order: {
    label: "Orders",
    features: {
      "order.view": { label: "View orders", staffToday: true },
      "order.create": { label: "Create order (staff)", staffToday: true },
      "order.self_order": { label: "Customer self-order via QR" },
      "order.edit": { label: "Edit order", staffToday: true },
      "order.cancel": { label: "Cancel order", staffToday: true },
      "order.delete": { label: "Delete order", staffToday: true },
      "order.cancel_room_booking": { label: "Cancel room booking", staffToday: true },
      "order.move": { label: "Move order between tables", staffToday: true },
      "order.bill": { label: "Bill and KOT print", staffToday: true },
      "order.takeaway": { label: "Takeaway orders" },
      "order.delivery": { label: "Delivery orders and charge" },
    },
  },
  payment: {
    label: "Payments",
    features: {
      "payment.collect": { label: "Collect payment", staffToday: true },
      "payment.split": { label: "Split payment", staffToday: true },
      "payment.settle": { label: "Settlement amount", staffToday: true },
      "payment.advance.create": { label: "Add advance payment", staffToday: true },
      "payment.advance.edit": { label: "Edit advance payment", staffToday: true },
      "payment.advance.delete": { label: "Delete advance payment", staffToday: true },
    },
  },
  kds: {
    label: "Kitchen display",
    features: {
      "kds.view": { label: "View kitchen queue", staffToday: true },
      "kds.item_ready": { label: "Mark item ready", staffToday: true },
    },
  },
  analytics: {
    label: "Analytics",
    features: {
      "analytics.revenue": { label: "Sales and revenue" },
      "analytics.products": { label: "Top products" },
      "analytics.categories": { label: "Top categories" },
    },
  },
  staff: {
    label: "Staff and roles",
    features: {
      "staff.view": { label: "View staff" },
      "staff.create": { label: "Create staff" },
      "staff.edit": { label: "Edit staff" },
      "staff.delete": { label: "Delete staff" },
      "staff.roles": { label: "Custom roles and permissions" },
    },
  },
  notification: {
    label: "Notifications",
    features: {
      "notification.view": { label: "Live order notifications", staffToday: true },
    },
  },
};

const allFeatures = () =>
  Object.values(catalog).flatMap((module) => Object.entries(module.features));

// Every key in the software: used for the Legacy plan
const allFeatureKeys = () => allFeatures().map(([key]) => key);

// Only what staff can do today: used for the "Staff (legacy)" role
const legacyStaffKeys = () =>
  allFeatures()
    .filter(([, feature]) => feature.staffToday)
    .map(([key]) => key);

module.exports = { catalog, allFeatureKeys, legacyStaffKeys };