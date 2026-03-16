# Crudify UI

A lightweight, config-driven CRUD UI framework for vanilla JavaScript.

Crudify UI dynamically generates list, view, create, and edit screens from configuration.
It integrates with REST APIs and requires no framework dependency (no React, no Vue).

---

### ✨ Features

* ⚡ **Config-driven CRUD UI**: Fast setup via JSON-like config.
* 🧱 **Auto generation**: Handles both lists and forms automatically.
* 🔁 **Deep Support**: Nested object & array support out of the box.
* 📦 **REST API**: Native integration with standard endpoints.
* 🧩 **Plugin-ready**: Works with Select2, Datepicker, etc.
* 🎨 **Customizable**: Fully overrideable templates and renderers.
* 🧠 **Architecture**: Instance-based and namespaced (`cfy-*`) DOM.
* 🚫 **Zero Dependencies**: Pure vanilla JS.

---

### 📦 Installation

#### Option 1 — CDN (Recommended)

**Versioned**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/crudify-ui@1.0.1/dist/crudify.min.css">
<script src="https://cdn.jsdelivr.net/npm/crudify-ui@1.0.1/dist/crudify.min.js"></script>

```

**Latest**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/crudify-ui@latest/dist/crudify.min.css">
<script src="https://cdn.jsdelivr.net/npm/crudify-ui@latest/dist/crudify.min.js"></script>

```

#### Option 2 — NPM

```bash
npm install crudify-ui

```

**Then import it:**

```javascript
import "crudify-ui/dist/crudify.css";
import crudify from "crudify-ui";

```

---

### 🚀 Basic Usage

**HTML**

```html
<div id="products"></div>

```

**Boot**

```javascript
crudify.boot({
  templates: {},
  plugins: {}
});

```

**Mount**

```javascript
crudify.mount({
  el: "#products",
  name: "Products",
  endpoint: "/api/products",
  pagination: true,

  fields: {
    name: { title: "Product Name" },
    price: { title: "Price", type: "number" },
    description: { title: "Description", el: "textarea" }
  }
});

```

---

### 🧩 Field Configuration

**Minimal:**

```javascript
name: { title: "Product Name" }

```

**Full:**

```javascript
name: {
  title: "Product Name",
  el: "input",
  type: "text",
  required: true,
  placeholder: "Enter name",
  value: "",
  className: "custom-input",
  wrapperClassName: "row",
  id: "product-name",
  attrs: { "data-test": "name" },
  showLabel: true,
  showError: true
}

```

---

### 🧱 Nested Objects & Arrays

**Nested Object**

```javascript
address: {
  title: "Address",
  type: "object",
  fields: {
    city: { title: "City" },
    state: { title: "State" }
  }
}

```

**Arrays (Primitive & Object)**

```javascript
// Primitive
tags: {
  title: "Tags",
  type: "array",
  el: "input"
}

// Objects
items: {
  title: "Items",
  type: "array",
  fields: {
    name: { title: "Name" },
    price: { title: "Price", type: "number" }
  }
}

```

---

### 🎨 Templates (Full Override Support)

All UI parts are customizable via `crudify.boot`.

```javascript
crudify.boot({
  templates: {
    // Container Classes
    containerClass: "my-container",
    containerShellClass: "my-shell",
    
    // CRUD Buttons (Supports Class, Text, or full HTML)
    createBtnText: "Add New Item",
    deleteBtnClass: "btn btn-danger",
    
    // Pagination
    paginationActiveClass: "active",
    
    // Array Buttons
    arrayAddBtnText: "Add Row",
    arrayRemoveBtnClass: "remove-btn"
  }
});

```

---

### 🔌 Plugins

**Register a plugin:**

```javascript
crudify.registerPlugin("select2", function(el) {
  if (window.jQuery && jQuery.fn.select2) {
    jQuery(el).select2();
  }
});

```

**Usage in fields:**

```javascript
category: {
  el: "select",
  plugin: "select2"
}

```

---

### 🔧 Advanced Example

```javascript
crudify.mount({
  el: "#users-container",
  name: "Users",
  endpoint: "/api/users",
  pagination: true,
  modalSize: "lg",

  fields: {
    full_name: { title: "Full Name", required: true },
    email: { title: "Email", type: "email" },
    role: {
      title: "Role",
      el: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Manager", value: "manager" }
      ]
    },
    status: {
      title: "Status",
      html: true,
      format: function(value) {
        return value === "active"
          ? `<span class="badge badge-success">Active</span>`
          : `<span class="badge badge-secondary">Inactive</span>`;
      }
    }
  }
});

```

---

### 📜 License & Links

* **License**: MIT © 2026 Ajay Kumar
* **Repository**: [github.com/ajayexpert/crudify-ui](https://github.com/ajayexpert/crudify-ui)
