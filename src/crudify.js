/*!
 * Crudify v1.0.0 (jQuery-only)
 * https://github.com/ajayexpert/crudify-ui
 *
 * (c) 2026 Ajay Kumar
 * Released under the MIT License.
 */


// templates: {
//   containerClass,
//   containerShellClass,
//   containerShellHeaderClass,
//   containerShellBodyClass,
//   containerShellFooterClass,

//   createBtnClass,
//   createBtnText,
//   createBtn,            // full override HTML

//   editBtnClass,
//   editBtnText,
//   editBtn,

//   deleteBtnClass,
//   deleteBtnText,
//   deleteBtn,

//   viewBtnClass,
//   viewBtnText,
//   viewBtn
//   buttonClass: "btn",
//   paginationBtnClass: "btn-outline",
//   paginationActiveClass: "btn-primary",
//   paginationDisabledClass: "opacity-50",

//   // full override
//   paginationBtn: "<button class='btn btn-light'></button>"

//   saveBtnClass: "btn-primary",
//   saveBtnText: "Submit",
//   saveBtn: "<button class='btn btn-success'>Save Now</button>",

//   closeBtnClass: "btn-outline",
//   closeBtnText: "Cancel",
//   closeBtn: "<button class='btn btn-danger'>X</button>"

//   arrayAddBtnClass,
//   arrayAddBtnText,
//   arrayAddBtn,

//   arrayRemoveBtnClass,
//   arrayRemoveBtnText,
//   arrayRemoveBtn
// }

(function (global, $) {
  "use strict";

  if (!$) throw new Error("Crudify requires jQuery. Load jQuery before crudify.js");

  /* =========================================================
     Helpers (PURE)
  ========================================================= */
  var _helpers = {
    serializeName: function (name) {
      return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "module";
    },

    isObj: function (x) {
      return x && typeof x === "object" && !Array.isArray(x);
    },

    isFn: function (x) {
      return typeof x === "function";
    },

    deepMerge: function (target) {
      target = target || {};
      for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i] || {};
        for (var k in src) {
          if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
          var v = src[k];
          if (_helpers.isObj(v) && _helpers.isObj(target[k])) target[k] = _helpers.deepMerge({}, target[k], v);
          else target[k] = v;
        }
      }
      return target;
    },

    
    normalizeField: function (def, key) {
      def = def || {};

      return {
        key: key,
        title: def.title || def.label || key,

        // -----------------------------------
        // TYPE SYSTEM
        // -----------------------------------
        // If explicitly object/array → use it
        // Otherwise fall back to input/select/etc
        type: def.type || null,

        // For primitive fields
        el: def.el || "input",

        // input type (text, number, etc)
        inputType: def.type && def.type !== "object" && def.type !== "array"
          ? def.type
          : (def.inputType || "text"),

        // Nested schema
        fields: def.fields || null,

        // -----------------------------------
        // BASIC FIELD CONFIG
        // -----------------------------------
        required: !!def.required,
        placeholder: def.placeholder || "",
        value: def.value,

        // -----------------------------------
        // CLASSES
        // -----------------------------------
        className: def.className || def.classNames || "",
        wrapperClassName: def.wrapperClassName || def.parentClassNames || "",

        arrayClassName: def.arrayClassName || "",
        arrayItemClassName: def.arrayItemClassName || "",
        
        viewClassName: def.viewClassName || "",

        // -----------------------------------
        // ATTRIBUTES
        // -----------------------------------
        id: def.id,
        attrs: def.attrs || {},

        // -----------------------------------
        // VISIBILITY FLAGS (LEGACY SUPPORT)
        // -----------------------------------
        showLabel: def.showLabel !== false,
        showError: def.showError !== false,

        showInForm: def.showInForm !== false,
        showInList: def.showInList !== false,
        showInView: def.showInView !== false,

        // Component mode visibility
        component: def.component || {},

        // -----------------------------------
        // SELECT SUPPORT
        // -----------------------------------
        items: def.items || def.options || [],
        itemsEndpoint: def.itemsEndpoint,
        map: def.map,

        // -----------------------------------
        // PLUGIN SUPPORT
        // -----------------------------------
        plugin: def.plugin,
        pluginOptions: def.pluginOptions || {},

        // -----------------------------------
        // FORMAT + HTML SUPPORT
        // -----------------------------------
        format: def.format,
        html: def.html === true,
        headerHtml: def.headerHtml || "",


        //Array Add and Remvove method
        afterAdd: def.afterAdd,
        afterRemove: def.afterRemove,
      };
    },


    // record value precedence:
    // if record has key -> use it (even empty string/null)
    // else -> field.value (fn or literal)
    // else -> ""
    resolveFieldValue: function (record, field, ctx) {
      if (record && Object.prototype.hasOwnProperty.call(record, field.key)) {
        return record[field.key];
      }
      if (_helpers.isFn(field.value)) return field.value(ctx);
      if (field.value !== undefined) return field.value;
      return "";
    },

    // Map select item -> { text, val, attrs }
    mapItem: function (item, field) {
      var out = { text: "", val: "", attrs: {} };

      if (typeof item === "string" || typeof item === "number") {
        out.text = String(item);
        out.val = String(item);
        return out;
      }

      if (!field.map) {
        out.text = item.text != null ? item.text : (item.label != null ? item.label : "");
        out.val = item.val != null ? item.val : (item.value != null ? item.value : "");
        return out;
      }

      if (_helpers.isFn(field.map)) {
        var m = field.map(item) || {};
        out.text = m.text != null ? m.text : "";
        out.val = m.val != null ? m.val : "";
        out.attrs = m.attrs || {};
        return out;
      }

      if (_helpers.isObj(field.map)) {
        out.text = item[field.map.text];
        out.val = item[field.map.val];

        if (field.map.attrs && _helpers.isObj(field.map.attrs)) {
          for (var a in field.map.attrs) {
            if (!Object.prototype.hasOwnProperty.call(field.map.attrs, a)) continue;
            var srcKey = field.map.attrs[a];
            out.attrs[a] = item[srcKey];
          }
        }
        return out;
      }

      return out;
    },

    // Build query string (no encoding surprises)
    toQuery: function (obj) {
      var parts = [];
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (obj[k] == null) continue;
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(obj[k])));
      }
      return parts.length ? "?" + parts.join("&") : "";
    },

    // Nested Field Resolver (Helper)
    getValueByPath: function (obj, path) {
      if (!obj || !path) return undefined;

      var parts = String(path).split(".");
      var current = obj;

      for (var i = 0; i < parts.length; i++) {
        if (current == null) return undefined;
        current = current[parts[i]];
      }

      return current;
    },

  };

  /* =========================================================
     Renderers (STRUCTURE ONLY)
     Must include: [data-cfy-input]
  ========================================================= */
  var _renderers = {
    input: function () {
      return $(
        '<div class="cfy-row" data-cfy-wrap>' +
          '<label data-cfy-label></label>' +
          '<input data-cfy-input />' +
          '<div data-cfy-error></div>' +
        "</div>"
      );
    },

    textarea: function () {
      return $(
        '<div class="cfy-row" data-cfy-wrap>' +
          '<label data-cfy-label></label>' +
          '<textarea data-cfy-input></textarea>' +
          '<div data-cfy-error></div>' +
        "</div>"
      );
    },

    select: function () {
      return $(
        '<div class="cfy-row" data-cfy-wrap>' +
          '<label data-cfy-label></label>' +
          '<select data-cfy-input></select>' +
          '<div data-cfy-error></div>' +
        "</div>"
      );
    },

    checkbox: function () {
      return $(
        '<div class="cfy-row" data-cfy-wrap>' +
          '<label class="cfy-checkbox-label">' +
            '<input type="checkbox" data-cfy-input /> ' +
            '<span data-cfy-label></span>' +
          "</label>" +
          '<div data-cfy-error></div>' +
        "</div>"
      );
    }
  };

  /* =========================================================
     Plugins registry
  ========================================================= */
  var _plugins = {};

  /* =========================================================
     Default Templates (high-level UI)
  ========================================================= */
  var _defaultTemplates = {
    // Main shell
    shell: function () {
      return $(
        '<div class="cfy-shell">' +
          '<div class="cfy-header" data-cfy-region="header"></div>' +
          '<div class="cfy-body" data-cfy-region="body"></div>' +
          '<div class="cfy-footer" data-cfy-region="footer"></div>' +
        "</div>"
      );
    },

    toolbar: function (ctx) {
      return $(
        '<div class="cfy-toolbar">' +
          '<div class="cfy-title" data-cfy-region="title"></div>' +
          '<div class="cfy-header-actions">' +
            '<button type="button" class="cfy-btn" data-cfy-action="create">Create</button>' +
          "</div>" +
        "</div>"
      );
    },

    table: function () {
      return $(
        '<table class="cfy-table">' +
          "<thead></thead>" +
          "<tbody></tbody>" +
        "</table>"
      );
    },

    pagination: function () {
      return $(
        '<div class="cfy-footer-inner">' +
          '<div class="cfy-footer-status" data-cfy-region="footerStatus"></div>' +
          '<div class="cfy-pagination" data-cfy-region="pagination"></div>' +
        '</div>'
      );
    },

    modal: function () {
      return $(
        '<div class="cfy-overlay" data-cfy-overlay style="display:none;">' +
          '<div class="cfy-modal" role="dialog" aria-modal="true">' +
            '<div class="cfy-modal-header">' +
              '<strong data-cfy-region="modalTitle">Form</strong>' +
              '<button type="button" class="cfy-btn" data-cfy-action="closeModal">Close</button>' +
            "</div>" +
            '<div class="cfy-modal-body" data-cfy-region="modalBody"></div>' +
            '<div class="cfy-modal-footer">' +
              '<button type="button" class="cfy-btn" data-cfy-action="save">Save</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }
  };

  /* =========================================================
     Instance
  ========================================================= */
  function CrudifyInstance(core, config) {
    this.core = core;
    this.config = config;

    this.name = config.name;
    this.slug = _helpers.serializeName(config.name);

    // =============================
    // Component Capabilities
    // =============================
    this.components = $.extend(
      {
        create: true,
        edit: true,
        delete: true,
        view: true
      },
      config.components || {}
    );

    this.$host = $(config.el);
    this.$root = null;

    this.state = {
      loading: false,
      page: 1,
      limit: (config.limit != null ? config.limit : 10),
      pages: 1,
      total: 0,
      rows: [],
      record: {},
      errors: {},

      search: "",

      // mode: "list" only for v1 UI, modal handles create/edit
      mode: "list"
    };

    this._itemsCache = {}; // endpoint -> array
  }

  CrudifyInstance.prototype._ctx = function () {
    return {
      core: this.core,
      instance: this,
      config: this.config,
      state: this.state,
      name: this.name,
      slug: this.slug
    };
  };

  CrudifyInstance.prototype.init = function () {
    this._buildContainer();
    this._buildUI();
    this._bindEvents();

    // Pre-render form if formRuntime === false (default)
    // console.log("this.config ==> ", this.config);
    // console.log("this.config.formRuntime ==> ", this.config.formRuntime);
    
    if (this.config.formRuntime !== true) {
      // console.log("--- inside formRuntime ---");
      
      this._cachedForm = this._renderForm().addClass("u-hidden");
      this.$modal.find('[data-cfy-region="modalBody"]').append(this._cachedForm);
    }

    this.reload();
  };

  /* ---------------------------
     Container + UI
  ---------------------------- */

  CrudifyInstance.prototype._buildContainer = function () {
    if (!this.$host || !this.$host.length) {
      throw new Error('Mount element not found: "' + this.config.el + '"');
    }

    var tpl = this.core._templates || {};

    var tag = (this.config.container && this.config.container.tag)
      ? String(this.config.container.tag).toLowerCase()
      : "div";

    var extraClass = (this.config.container && this.config.container.className)
      ? String(this.config.container.className)
      : "";

    var attrs = (this.config.container && this.config.container.attrs)
      ? this.config.container.attrs
      : {};

    var cls = [
      "cfy-container",
      "cfy-container--" + this.slug,
      tpl.containerClass || "",
      extraClass
    ].join(" ").trim();

    var $root = $("<" + tag + "/>", _helpers.deepMerge({}, attrs, { class: cls }));
    this.$host.empty().append($root);
    this.$root = $root;
  };


  CrudifyInstance.prototype._tpl = function (name) {
    // user can override high-level templates via boot({templates:{...}})
    var t = (this.core._templates && this.core._templates[name]) ? this.core._templates[name] : null;

    // if user provides string html => $(html)
    if (typeof t === "string") return $(t);

    // if user provides function => function(ctx)-> jQuery node
    if (_helpers.isFn(t)) return t(this._ctx());

    // fallback defaults
    if (_defaultTemplates[name]) return _defaultTemplates[name](this._ctx());

    return null;
  };

  CrudifyInstance.prototype._buildUI = function () {
    var tpl = this.core._templates || {};

    var $shell = this._tpl("shell");
    var $toolbar = this._tpl("toolbar");
    var $table = this._tpl("table");
    var $pagination = this._tpl("pagination");
    var $modal = this._tpl("modal");

    // Apply shell-level classes
    $shell.addClass(tpl.containerShellClass || "");
    $shell.find('[data-cfy-region="header"]').addClass(tpl.containerShellHeaderClass || "");
    $shell.find('[data-cfy-region="body"]').addClass(tpl.containerShellBodyClass || "");
    $shell.find('[data-cfy-region="footer"]').addClass(tpl.containerShellFooterClass || "");

    this.$root.empty().append($shell);

    this.$header = this.$root.find('[data-cfy-region="header"]');
    this.$body = this.$root.find('[data-cfy-region="body"]');
    this.$footer = this.$root.find('[data-cfy-region="footer"]');

    // =============================
    // HEADER
    // =============================
    this.$header.empty().append($toolbar);

    var $title = this.$header.find('[data-cfy-region="title"]');
    if ($title.length) $title.text(this.name);

    var $createBtn = this.$header.find('[data-cfy-action="create"]');

    if ($createBtn.length) {

      // 🔥 If disabled → remove button completely
      if (this.components.create === false) {
        $createBtn.remove();
      } else {

        if (tpl.createBtn) {
          $createBtn.replaceWith($(tpl.createBtn).attr("data-cfy-action", "create"));
        } else {
          if (tpl.buttonClass) $createBtn.addClass(tpl.buttonClass);
          if (tpl.createBtnClass) $createBtn.addClass(tpl.createBtnClass);
          if (tpl.createBtnText) $createBtn.html(tpl.createBtnText);
        }

      }
    }



    // =============================
    // SEARCH INPUT
    // =============================
    if (this.config.filter !== false) {

      var tpl = this.core._templates || {};
      var $search;

      if (tpl.searchInput) {
        $search = $(tpl.searchInput);
      } else {
        $search = $(
          '<input type="text" class="cfy-search" ' +
          'placeholder="Search..." data-cfy-search />'
        );
      }

      if (tpl.searchInputClass) {
        $search.addClass(tpl.searchInputClass);
      }

      // 🔥 Reload Button
      var $reload;

      if (tpl.reloadBtn) {

        // FULL override
        $reload = $(tpl.reloadBtn)
          .attr("data-cfy-action", "reload");

      } else {

        $reload = $('<button type="button" data-cfy-action="reload"></button>');

        if (tpl.buttonClass) $reload.addClass(tpl.buttonClass);
        if (tpl.reloadBtnClass) $reload.addClass(tpl.reloadBtnClass);

        $reload.html(
          tpl.reloadBtnText != null
            ? tpl.reloadBtnText
            : "&#x21bb;"
        );
      }


      this.$header.find(".cfy-header-actions").prepend($search).prepend($reload);
    }


    // =============================
    // TABLE
    // =============================
    this.$table = $table;
    if (tpl.tableClass) this.$table.addClass(tpl.tableClass);
    this.$body.empty().append(this.$table);

    // =============================
    // FOOTER
    // =============================
    this.$footer.empty().append($pagination);

    this.$footerInner = this.$footer.find(".cfy-footer-inner");
    this.$pagination = this.$footer.find('[data-cfy-region="pagination"]');
    this.$footerStatus = this.$footer.find('[data-cfy-region="footerStatus"]');

    // =============================
    // MODAL
    // =============================
    $modal
      .addClass("cfy-overlay--" + this.slug)
      .attr("data-cfy-instance", this.slug);

    // ============================================
    // MODAL TEMPLATE RESOLUTION
    // mount.templates > boot.templates
    // ============================================

    var globalTpl = this.core._templates || {};
    var localTpl = this.config.templates || {};

    // helper resolver
    function resolve(key) {
      return localTpl[key] != null
        ? localTpl[key]
        : globalTpl[key];
    }

    // Base overlay class
    var modalClass = resolve("modalClass");
    if (modalClass) {
      $modal.addClass(modalClass);
    }

    // Size system (clean & predictable)
    var modalSize =
      this.config.modalSize ||
      resolve("modalSize");

    if (modalSize) {
      $modal.find(".cfy-modal").addClass("cfy-modal-" + modalSize);
    }

    // Content
    var $content = $modal.find(".cfy-modal-content");
    if ($content.length) {
      var contentClass = resolve("modalContentClass");
      if (contentClass) $content.addClass(contentClass);
    }

    // Header
    var $header = $modal.find(".cfy-modal-header");
    if ($header.length) {
      var headerClass = resolve("modalHeaderClass");
      if (headerClass) $header.addClass(headerClass);
    }

    // Body
    var $body = $modal.find(".cfy-modal-body");
    if ($body.length) {
      var bodyClass = resolve("modalBodyClass");
      if (bodyClass) $body.addClass(bodyClass);
    }

    // Footer
    var $footer = $modal.find(".cfy-modal-footer");
    if ($footer.length) {
      var footerClass = resolve("modalFooterClass");
      if (footerClass) $footer.addClass(footerClass);
    }
    


    // SAVE BUTTON
    var $saveBtn = $modal.find('[data-cfy-action="save"]');
    if ($saveBtn.length) {
      if (tpl.saveBtn) {
        $saveBtn.replaceWith($(tpl.saveBtn).attr("data-cfy-action", "save"));
      } else {
        if (tpl.buttonClass) $saveBtn.addClass(tpl.buttonClass);
        if (tpl.saveBtnClass) $saveBtn.addClass(tpl.saveBtnClass);
        if (tpl.saveBtnText) $saveBtn.html(tpl.saveBtnText);
      }
    }

    // CLOSE BUTTON
    var $closeBtn = $modal.find('[data-cfy-action="closeModal"]');
    if ($closeBtn.length) {
      if (tpl.closeBtn) {
        $closeBtn.replaceWith($(tpl.closeBtn).attr("data-cfy-action", "closeModal"));
      } else {
        if (tpl.buttonClass) $closeBtn.addClass(tpl.buttonClass);
        if (tpl.closeBtnClass) $closeBtn.addClass(tpl.closeBtnClass);
        if (tpl.closeBtnText) $closeBtn.html(tpl.closeBtnText);
      }
    }

    this.$modal = $modal;
    $("body").append(this.$modal);
  };




  /* ---------------------------
     Hooks
  ---------------------------- */
  CrudifyInstance.prototype._hook = function (name, payload) {
    var hooks = this.config.hooks || {};
    var fn = hooks[name];
    if (_helpers.isFn(fn)) {
      try {
        return fn(payload, this._ctx());
      } catch (e) {
        if (global.console) console.warn("[Crudify hook error]", name, e);
      }
    }
    return undefined;
  };

  CrudifyInstance.prototype._error = function (err, where) {
    this._hook("onError", { error: err, where: where });
    if (global.console) console.error("[Crudify error]", where, err);
  };

  /* ---------------------------
     Endpoint resolution
  ---------------------------- */

  CrudifyInstance.prototype._resolveEndpoint = function (type, id) {
    var base = this.config.endpoint;
    var eps = this.config.endpoints || {};
    var override = eps[type];

    function normalizeStringEndpoint(str, idMaybe) {
      if (!str) return str;
      // If update/delete and string does not already end with /:id, append /id
      if ((type === "update" || type === "delete") && idMaybe != null) {
        // if already includes id (user provided full path), we still append only if not already ends with id
        // Keep it simple: if string contains "{id}" replace; else append "/id"
        if (str.indexOf("{id}") >= 0) return str.replace("{id}", encodeURIComponent(String(idMaybe)));
        return str.replace(/\/$/, "") + "/" + encodeURIComponent(String(idMaybe));
      }
      return str;
    }

    // override exists
    if (override != null) {
      if (_helpers.isFn(override)) return override(id);
      if (typeof override === "string") return normalizeStringEndpoint(override, id);
    }

    // fallback to base endpoint
    if (!base) {
      throw new Error("No endpoint provided. Define endpoint or endpoints." );
    }

    if (type === "list" || type === "create") return base;
    if ((type === "update" || type === "delete") && id != null) {
      return base.replace(/\/$/, "") + "/" + encodeURIComponent(String(id));
    }

    return base;
  };

  /* ---------------------------
     REST calls
  ---------------------------- */

  CrudifyInstance.prototype.fetchList = function () {
    var self = this;
    var ctx = this._ctx();

    var url = this._resolveEndpoint("list");


    // =============================
    // Query Params Builder (Overridable)
    // =============================
    var defaultParams = {
      page: this.state.page,
      limit: this.state.limit,
      search: this.state.search || null
    };

    var finalParams = defaultParams;

    // 🔥 Allow override via config.queryBuilder
    if (typeof this.config.queryBuilder === "function") {
      try {
        var customParams = this.config.queryBuilder(defaultParams, this._ctx());
        if (customParams && typeof customParams === "object") {
          finalParams = customParams;
        }
      } catch (e) {
        if (window.console) console.warn("Crudify queryBuilder error:", e);
      }
    }

    var qs = _helpers.toQuery(finalParams);


    var full = url + qs;

    self.state.loading = true;
    self._renderStatus("Loading...");
    self._hook("beforeFetch", { type: "list", url: full });

    return $.getJSON(full)
      .done(function (resp) {
        self._hook("afterFetch", { type: "list", url: full, resp: resp });

        // expected: {status:1,data:[],page,pages,total}
        if (resp && resp.status === 1) {
          self.state.rows = Array.isArray(resp.data) ? resp.data : [];
          self.state.page = resp.page != null ? resp.page : self.state.page;
          self.state.pages = resp.pages != null ? resp.pages : 1;
          self.state.total = resp.total != null ? resp.total : self.state.rows.length;
        } else {
          self.state.rows = [];
          self.state.pages = 1;
          self.state.total = 0;
        }
      })
      .fail(function (xhr) {
        self._error(xhr, "fetchList");
        self.state.rows = [];
        self.state.pages = 1;
        self.state.total = 0;
      })
      .always(function () {
        self.state.loading = false;
      });
  };

  CrudifyInstance.prototype.createRecord = function (payload) {
    var self = this;
    var url = this._resolveEndpoint("create");
    self._hook("beforeSave", { mode: "create", url: url, payload: payload });

    return $.ajax({
      url: url,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload)
    })
      .done(function (resp) {
        self._hook("afterSave", { mode: "create", url: url, payload: payload, resp: resp });
      })
      .fail(function (xhr) {
        self._error(xhr, "createRecord");
      });
  };

  CrudifyInstance.prototype.updateRecord = function (id, payload) {
    var self = this;
    var url = this._resolveEndpoint("update", id);
    self._hook("beforeSave", { mode: "update", url: url, id: id, payload: payload });

    return $.ajax({
      url: url,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(payload)
    })
      .done(function (resp) {
        self._hook("afterSave", { mode: "update", url: url, id: id, payload: payload, resp: resp });
      })
      .fail(function (xhr) {
        self._error(xhr, "updateRecord");
      });
  };

  CrudifyInstance.prototype.deleteRecord = function (id) {
    var self = this;
    var url = this._resolveEndpoint("delete", id);
    self._hook("beforeDelete", { url: url, id: id });

    return $.ajax({
      url: url,
      method: "DELETE"
    })
      .done(function (resp) {
        self._hook("afterDelete", { url: url, id: id, resp: resp });
      })
      .fail(function (xhr) {
        self._error(xhr, "deleteRecord");
      });
  };

  /* ---------------------------
     Rendering: list/table/pagination
  ---------------------------- */

  CrudifyInstance.prototype.reload = function () {
    var self = this;
    return this.fetchList().always(function () {
      // console.log("self.state.total ==> ", self.state.total);
      
      self.renderList();
      self.renderPagination();
      self._renderStatus(self.state.total + " results");
    });
  };

  CrudifyInstance.prototype.refresh = function () {
    // alias
    return this.reload();
  };

  CrudifyInstance.prototype._listFields = function () {
    var fields = this.config.fields || {};
    var out = [];
    for (var key in fields) {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
      var f = _helpers.normalizeField(fields[key], key);
      if (f.showInList) out.push(f);
    }
    return out;
  };

  CrudifyInstance.prototype.renderList = function () {
    var tpl = this.core._templates || {};
    var fields = this._listFields();

    var $thead = this.$table.find("thead").empty();
    var $tbody = this.$table.find("tbody").empty();

    var $trh = $("<tr/>");

    for (var i = 0; i < fields.length; i++) {
      if (fields[i].component && fields[i].component.list && fields[i].component.list.hide) continue;
      $trh.append($("<th/>").text(fields[i].title));
    }

    if (
      this.components.view !== false ||
      this.components.edit !== false ||
      this.components.delete !== false
    ) {
      $trh.append($("<th/>").addClass("cfy-thead-actions").text("Actions"));
    }
    $thead.append($trh);

    if (!this.state.rows.length) {
      $tbody.append(
        $("<tr/>").append(
          $("<td/>", { colspan: fields.length + 1 }).text("No records")
        )
      );
      return;
    }

    
    for (var r = 0; r < this.state.rows.length; r++) {
      var row = this.state.rows[r] || {};
      var $tr = $("<tr/>");

      // =============================
      // Normal Columns (Nested + Format + HTML support)
      // =============================
      var ctx = this._ctx();

      for (var c = 0; c < fields.length; c++) {
        var f = fields[c];

        if (f.component && f.component.list && f.component.list.hide) continue;

        // 🔥 Nested field support
        var rawValue = _helpers.getValueByPath(row, f.key);

        var finalValue = rawValue;

        // 🔥 Format support
        if (typeof f.format === "function") {
          try {
            finalValue = f.format(rawValue, row, ctx);
          } catch (e) {
            if (window.console) console.warn("Crudify format error:", f.key, e);
            finalValue = rawValue;
          }
        }

        var $td = $("<td/>");

        // 🔥 HTML safe mode (explicit)
        if (f.html === true) {
          $td.html(finalValue != null ? finalValue : "");
        } else {
          $td.text(finalValue != null ? finalValue : "");
        }

        $tr.append($td);
      }


      // =============================
      // Actions Column
      // =============================
      var id = row._id || row.id;

      if (
        this.components.view !== false ||
        this.components.edit !== false ||
        this.components.delete !== false
      ) {

        var $actionsTd = $("<td/>").addClass("cfy-actions");
        var $inner = $('<div class="cfy-actions-inner"></div>');

        // VIEW
        if (this.components.view !== false) {
          var $viewBtn = tpl.viewBtn
            ? $(tpl.viewBtn).attr("data-cfy-action", "view").attr("data-cfy-id", id)
            : $('<button type="button" data-cfy-action="view" data-cfy-id="' + id + '">View</button>');

          if (!tpl.viewBtn && tpl.viewBtnClass) $viewBtn.addClass(tpl.viewBtnClass);
          if (!tpl.viewBtn && tpl.viewBtnText) $viewBtn.html(tpl.viewBtnText);

          $inner.append($viewBtn);
        }

        // EDIT
        if (this.components.edit !== false) {
          var $editBtn = tpl.editBtn
            ? $(tpl.editBtn).attr("data-cfy-action", "edit").attr("data-cfy-id", id)
            : $('<button type="button" data-cfy-action="edit" data-cfy-id="' + id + '">Edit</button>');

          if (!tpl.editBtn && tpl.editBtnClass) $editBtn.addClass(tpl.editBtnClass);
          if (!tpl.editBtn && tpl.editBtnText) $editBtn.html(tpl.editBtnText);

          $inner.append($editBtn);
        }

        // DELETE
        if (this.components.delete !== false) {
          var $deleteBtn = tpl.deleteBtn
            ? $(tpl.deleteBtn).attr("data-cfy-action", "delete").attr("data-cfy-id", id)
            : $('<button type="button" data-cfy-action="delete" data-cfy-id="' + id + '">Delete</button>');

          if (!tpl.deleteBtn && tpl.deleteBtnClass) $deleteBtn.addClass(tpl.deleteBtnClass);
          if (!tpl.deleteBtn && tpl.deleteBtnText) $deleteBtn.html(tpl.deleteBtnText);

          $inner.append($deleteBtn);
        }

        if ($inner.children().length) {
          $actionsTd.append($inner);
          $tr.append($actionsTd);
        }
      }

      // 🔥 THIS WAS MISSING
      $tbody.append($tr);

    }



  };


  CrudifyInstance.prototype.renderPagination = function () {
    var self = this;
    var tpl = this.core._templates || {};
    var $p = this.$pagination.empty();

    if (!this.config.pagination) return;
    if (this.state.pages <= 1) return;

    function buildButton(label, page, disabled, active) {
      var $btn;

      // 🔥 Full override support
      if (tpl.paginationBtn) {
        $btn = $(tpl.paginationBtn)
          .attr("data-cfy-action", "page")
          .attr("data-cfy-page", page);
      } else {
        $btn = $('<button type="button" data-cfy-action="page"></button>')
          .attr("data-cfy-page", page)
          .text(label);

        // Default base class
        $btn.addClass("cfy-btn");

        // Global button class
        if (tpl.buttonClass) $btn.addClass(tpl.buttonClass);

        // Pagination-specific class
        if (tpl.paginationBtnClass) $btn.addClass(tpl.paginationBtnClass);
      }

      // Label (only if not full override)
      if (!tpl.paginationBtn) {
        $btn.text(label);
      }

      // Disabled
      if (disabled) {
        $btn.prop("disabled", true);
        if (tpl.paginationDisabledClass) $btn.addClass(tpl.paginationDisabledClass);
      }

      // Active
      if (active) {
        $btn.addClass(tpl.paginationActiveClass || "is-active");
      }

      return $btn;
    }

    function addBtn(label, page, disabled, active) {
      $p.append(buildButton(label, page, disabled, active));
    }

    addBtn("Prev", Math.max(1, self.state.page - 1), self.state.page <= 1, false);

    var win = 2;
    var start = Math.max(1, self.state.page - win);
    var end = Math.min(self.state.pages, self.state.page + win);

    if (start > 1) addBtn("1", 1, false, self.state.page === 1);
    if (start > 2) $p.append($('<span class="cfy-page-gap">...</span>'));

    for (var p = start; p <= end; p++) {
      addBtn(String(p), p, false, self.state.page === p);
    }

    if (end < self.state.pages - 1) $p.append($('<span class="cfy-page-gap">...</span>'));
    if (end < self.state.pages) addBtn(String(self.state.pages), self.state.pages, false, self.state.page === self.state.pages);
  };


  CrudifyInstance.prototype._renderStatus = function (text) {
    if (this.$footerStatus && this.$footerStatus.length) {
      this.$footerStatus.text(text ? ("Showing " + text) : "");
    }
  };

  /* ---------------------------
     Modal + Form rendering
  ---------------------------- */

  CrudifyInstance.prototype.openCreate = function () {
    this.state.mode = "create";
    this.state.record = {};
    this._openModal("Create " + this.name, "create");
  };

  CrudifyInstance.prototype.openEdit = function (id) {
    this.state.mode = "edit";
    var row = this.state.rows.find(function (r) {
      return String(r._id) === String(id) || String(r.id) === String(id);
    });

    if (!row) return;

    this.state.record = _helpers.deepMerge({}, row);
    this._openModal("Edit " + this.name, "edit");
  };

  CrudifyInstance.prototype.openView = function (id) {
    this.state.mode = "view";
    var row = this.state.rows.find(function (r) {
      return String(r._id) === String(id) || String(r.id) === String(id);
    });

    if (!row) return;

    this.state.record = _helpers.deepMerge({}, row);
    this._openModal("View " + this.name, "view");
  };



  CrudifyInstance.prototype.closeModal = function () {
    this.$modal.hide();

    if (this.config.formRuntime === true) {
      // runtime mode → destroy form each time
      this.$modal.find('[data-cfy-region="modalBody"]').empty();
    } else {
      // cached mode → just hide form
      if (this._cachedForm) {
        this._cachedForm.addClass("u-hidden");
      }
    }
  };

  CrudifyInstance.prototype._openModal = function (title, type) {
    this.state.mode = type;   // 🔥 CRITICAL FIX

    var ctx = this._ctx();
    var tpl = this.core._templates || {};

    var $body = this.$modal.find('[data-cfy-region="modalBody"]').empty();
    var $footer = this.$modal.find(".cfy-modal-footer").empty();

    this.$modal.find('[data-cfy-region="modalTitle"]').text(title);

    // ============================
    // BODY
    // ============================

    if (type === "view") {
      $body.append(this._renderViewForm());
    } else {
      $body.append(this._renderForm(type));
    }

    // ============================
    // FOOTER BUTTONS
    // ============================

    if (type === "view") {

      var $dismissBtn;

      // Full override support
      if (tpl.dismissBtn) {
        $dismissBtn = $(tpl.dismissBtn).attr("data-cfy-action", "closeModal");
      } else {
        $dismissBtn = $('<button type="button" data-cfy-action="closeModal"></button>');

        if (tpl.buttonClass) $dismissBtn.addClass(tpl.buttonClass);
        if (tpl.dismissBtnClass) $dismissBtn.addClass(tpl.dismissBtnClass);

        $dismissBtn.text(tpl.dismissBtnText || "Dismiss");
      }

      $footer.append($dismissBtn);

    } else {

      // CREATE / EDIT → Only Save button
      var $saveBtn;

      if (tpl.saveBtn) {
        $saveBtn = $(tpl.saveBtn).attr("data-cfy-action", "save");
      } else {
        $saveBtn = $('<button type="button" data-cfy-action="save"></button>');

        if (tpl.buttonClass) $saveBtn.addClass(tpl.buttonClass);
        if (tpl.saveBtnClass) $saveBtn.addClass(tpl.saveBtnClass);

        $saveBtn.text(tpl.saveBtnText || "Save");
      }

      $footer.append($saveBtn);
    }

    this.$modal.show();
  };






  CrudifyInstance.prototype._renderForm = function () {
    var ctx = this._ctx();
    var $form = $('<div class="cfy-form" data-cfy-form></div>');
    var fields = this.config.fields || {};
    var self = this;

    Object.keys(fields).forEach(function (key) {
      var field = _helpers.normalizeField(fields[key], key);

      if (field.component && field.component[self.state.mode] && field.component[self.state.mode].hide) {
        return;
      }

      var $node = self._renderNode(field, [key], self.state.record || {});
      if ($node) $form.append($node);
    });

    return $form;
  };


  CrudifyInstance.prototype._renderNode = function (field, path, record) {
    var self = this;
    var mode = self.state.mode;

    // Component hide (ALWAYS check here)
    if (field.component && field.component[mode] && field.component[mode].hide) {
      return null;
    }

    // Virtual field (format-only, no type, no explicit el override)
    var isVirtual =
      !field.type &&
      !field.fields &&
      field.format &&
      (!field.el || field.el === "input");

    if (isVirtual && (mode === "create" || mode === "edit")) {
      return null;
    }

    var value = self._getNestedValue(record, path);

    // =============================
    // OBJECT
    // =============================
    if (field.type === "object" && field.fields) {

      var $group = $('<div class="cfy-group"></div>');
      var $label = $('<div class="cfy-group-label"></div>').text(field.title);
      var $body = $('<div class="cfy-group-body"></div>');

      // 🔥 APPLY CLASSES HERE
      if (field.wrapperClassName) {
        $group.addClass(field.wrapperClassName);
      }

      if (field.className) {
        $body.addClass(field.className);
      }
      
      Object.keys(field.fields).forEach(function (childKey) {
        var childField = _helpers.normalizeField(field.fields[childKey], childKey);
        var childPath = path.concat(childKey);

        var $child = self._renderNode(childField, childPath, record);
        if ($child) $body.append($child);
      });

      if (!$body.children().length) return null;

      $group.append($label).append($body);
      return $group;
    }


    // =============================
    // ARRAY
    // =============================
    if (field.type === "array") {

      // console.log("ARRAY VALUE:", value);
      // console.log("STATE RECORD:", self.state.record);

      var tpl = self.core._templates || {};
      var ctx = self._ctx();

      var $wrap = $('<div class="cfy-array"></div>');
      var $label = $('<div class="cfy-group-label"></div>').text(field.title);
      var $itemsHeader = $('<div class="cfy-array-header"></div>').html(field.headerHtml || "");
      var $items = $('<div class="cfy-array-items"></div>');

      // 🔥 APPLY WRAPPER CLASSES
      if (field.arrayClassName) {
        $wrap.addClass(field.arrayClassName);
      }

      var arr = Array.isArray(value) ? value : [];

      // =====================================================
      // ITEM RENDERER (supports both primitive & object)
      // =====================================================
      function renderItem(item, index) {

        var $itemWrap = $('<div class="cfy-array-item"></div>');
        var itemPath = path.concat(index);

        // 🔥 APPLY ITEM CLASS
        if (field.arrayItemClassName) {
          $itemWrap.addClass(field.arrayItemClassName);
        }

        // ==========================
        // OBJECT ARRAY
        // ==========================
        if (field.fields) {

          Object.keys(field.fields).forEach(function (childKey) {
            var childField = _helpers.normalizeField(field.fields[childKey], childKey);
            var childNode = self._renderNode(childField, itemPath.concat(childKey), record);
            if (childNode) $itemWrap.append(childNode);
          });

        } else {

          // ==========================
          // PRIMITIVE ARRAY
          // ==========================

          var primitiveField = _helpers.normalizeField({
              title: field.title,
              el: field.el || "input",
              type: field.inputType || "text",
              required: field.required,
              placeholder: field.placeholder,
              className: field.className,
              wrapperClassName: field.wrapperClassName,
              options: field.options,
              attrs: field.attrs,
              component: field.component
            }, field.key);

          // console.log("EL:", primitiveField.el);
          // console.log("Renderer:", renderer);

          var elType = String(primitiveField.el || "input").toLowerCase();
          var renderer = self.core._renderers[elType];

          if (!renderer) {
            console.warn("Renderer not found for:", elType);
            renderer = self.core._renderers["input"];
          }
          
          if (!renderer) return null;

          var $node = renderer(primitiveField, ctx);

          var pathKey = itemPath.join(".");
          $node.find("[data-cfy-input]").attr("data-cfy-field", pathKey);

          // console.log(" ==> ", $node, primitiveField, ctx, itemPath);
          

          self._hydrateField($node, primitiveField, ctx, itemPath);

          // var $input = $node.find("[data-cfy-input]").first();
          // if ($input.length) {
          //   $input.val(item != null ? item : "");
          // }

          $itemWrap.append($node);
        }

        // ==========================
        // REMOVE BUTTON
        // ==========================
        var $remove;

        if (tpl.arrayRemoveBtn) {
          $remove = $(tpl.arrayRemoveBtn);
        } else {
          $remove = $('<button type="button"></button>');

          if (tpl.buttonClass) $remove.addClass(tpl.buttonClass);
          if (tpl.arrayRemoveBtnClass) $remove.addClass(tpl.arrayRemoveBtnClass);

          $remove.text(tpl.arrayRemoveBtnText || "Remove");
        }

        $remove.on("click", function () {

          $itemWrap.remove();

          if (typeof field.afterRemove === "function") {
            field.afterRemove({
              instance: self,
              field: field,
              index: index,
              mode: self.state.mode
            });
          }
        });

        $itemWrap.append(
          $('<span class="cfy-btn-box"></span>').append($remove)
        );

        return $itemWrap;
      }

      // =====================================================
      // RENDER EXISTING ITEMS
      // =====================================================
      arr.forEach(function (item, i) {

        var $item = renderItem(item, i);
        if (!$item) return;

        $items.append($item);

        if (typeof field.afterAdd === "function") {
          field.afterAdd({
            instance: self,
            field: field,
            $item: $item,
            index: i,
            mode: self.state.mode
          });
        }
      });

      // =====================================================
      // ADD BUTTON
      // =====================================================
      var $addBtn;

      if (tpl.arrayAddBtn) {
        $addBtn = $(tpl.arrayAddBtn);
      } else {
        $addBtn = $('<button type="button"></button>');

        if (tpl.buttonClass) $addBtn.addClass(tpl.buttonClass);
        if (tpl.arrayAddBtnClass) $addBtn.addClass(tpl.arrayAddBtnClass);

        $addBtn.text(tpl.arrayAddBtnText || "Add");
      }

      $addBtn.on("click", function () {

        var index = $items.children(".cfy-array-item").length;

        var $newItem = renderItem(
          field.fields ? {} : "",
          index
        );

        if (!$newItem) return;

        $items.append($newItem);

        if (typeof field.afterAdd === "function") {
          field.afterAdd({
            instance: self,
            field: field,
            $item: $newItem,
            index: index,
            mode: self.state.mode
          });
        }
      });

      $wrap
        .append($label)
        .append($itemsHeader)
        .append($items)
        .append($addBtn);

      return $wrap;
    }
    // =============================
    // / ARRAY
    // =============================


    
    // =============================
    // NORMAL FIELD
    // =============================
    var renderer = self.core._renderers[String(field.el).toLowerCase()];
    if (!renderer) return null;

    var $node = renderer(field, self._ctx());

    // IMPORTANT: set full path as data attribute
    var pathKey = path.join(".");
    $node.find("[data-cfy-input]").attr("data-cfy-field", pathKey);

    self._hydrateField($node, field, self._ctx(), path);

    return $node;
  };



  CrudifyInstance.prototype._renderViewForm = function () {

    var fields = this.config.fields || {};
    var record = this.state.record || {};
    var tpl = this.core._templates || {};
    var ctx = this._ctx();
    var self = this;

    var $wrap = $('<div class="cfy-view-form"></div>');

    function renderNode(field, path, record, depth) {

      if (field.component && field.component.view && field.component.view.hide) {
        return null;
      }

      var value = self._getNestedValue(record, path);

      // ============================================
      // 🔥 FORMAT OVERRIDE (APPLIES TO ANY TYPE)
      // ============================================
      if (typeof field.format === "function") {

        var formatted;

        try {
          formatted = field.format(value, record, ctx);
        } catch (e) {
          formatted = value;
        }

        var $row = $('<div class="cfy-row"></div>');
        var $label = $('<label class="cfy-label"></label>').text(field.title);
        var $value = $('<div class="cfy-value"></div>')
          .css("margin-left", "5px");

        if (tpl.viewValueClass) $value.addClass(tpl.viewValueClass);
        if (field.viewClassName) $value.addClass(field.viewClassName);

        if (field.html === true) {
          $value.html(formatted != null ? formatted : "");
        } else {
          $value.text(formatted != null ? formatted : "");
        }

        $row.append($label).append($value);
        return $row;
      }

      // ============================================
      // OBJECT (fallback structured)
      // ============================================
      if (field.type === "object" && field.fields) {

        var $group = $('<div class="cfy-view-group"></div>');
        var $title = $('<div class="cfy-view-group-title"></div>')
          .text(field.title);

        var $body = $('<div class="cfy-view-group-body"></div>')
          .css("margin-left", "5px");

        Object.keys(field.fields).forEach(function (childKey) {
          var childField = _helpers.normalizeField(field.fields[childKey], childKey);
          var child = renderNode(childField, path.concat(childKey), record, depth + 1);
          if (child) $body.append(child);
        });

        if (!$body.children().length) return null;

        $group.append($title).append($body);
        return $group;
      }

      // ============================================
      // ARRAY (fallback structured)
      // ============================================
      if (field.type === "array") {

        var arr = Array.isArray(value) ? value : [];
        if (!arr.length) return null;

        var $wrapArr = $('<div class="cfy-view-array"></div>');
        var $titleArr = $('<div class="cfy-view-group-title"></div>')
          .text(field.title);

        var $items = $('<div class="cfy-view-array-items"></div>')
          .css("margin-left", "5px");

        arr.forEach(function (item, index) {

          if (field.fields) {
            Object.keys(field.fields).forEach(function (childKey) {
              var childField = _helpers.normalizeField(field.fields[childKey], childKey);
              var child = renderNode(childField, path.concat(index, childKey), record, depth + 1);
              if (child) $items.append(child);
            });
          } else {
            $items.append(
              $('<div class="cfy-view-value"></div>')
                .text(JSON.stringify(item))
            );
          }

          if (index < arr.length - 1) {
            $items.append($("<hr/>"));
          }
        });

        $wrapArr.append($titleArr).append($items);
        return $wrapArr;
      }

      // ============================================
      // NORMAL FIELD
      // ============================================

      var $row = $('<div class="cfy-row"></div>');
      var $label = $('<label class="cfy-label"></label>').text(field.title);
      var $value = $('<div class="cfy-value"></div>')
        .css("margin-left", "5px");

      if (tpl.viewValueClass) $value.addClass(tpl.viewValueClass);
      if (field.viewClassName) $value.addClass(field.viewClassName);

      $value.text(value != null ? value : "");

      $row.append($label).append($value);

      return $row;
    }

    Object.keys(fields).forEach(function (key) {
      var field = _helpers.normalizeField(fields[key], key);
      var node = renderNode(field, [key], record, 0);
      if (node) $wrap.append(node);
    });

    return $wrap;
  };



  CrudifyInstance.prototype._renderCustom = function (field) {
    var tpl = (this.core._templates && this.core._templates[field.el]) ? this.core._templates[field.el] : null;
    if (!tpl) throw new Error('No renderer or template found for el="' + field.el + '"');
    if (typeof tpl === "string") return $(tpl);
    if (_helpers.isFn(tpl)) return tpl(this._ctx(), field);
    throw new Error('Invalid template for el="' + field.el + '"');
  };

  CrudifyInstance.prototype._hydrateField = function ($node, field, ctx, path) {
    var coreTemplates = ctx.core._templates || {};
    var mode = this.state.mode || "list";

    var $wrap = $node.is("[data-cfy-wrap]")
      ? $node
      : $node.find("[data-cfy-wrap]").first();

    if (!$wrap.length) $wrap = $node;

    var $input = $node.find("[data-cfy-input]").first();
    if (!$input.length) return;

    var $label = $node.find("[data-cfy-label]").first();
    var $error = $node.find("[data-cfy-error]").first();

    // ============================================
    // RESET STATE
    // ============================================
    $wrap.show();
    $wrap.removeClass("cfy-readonly");
    $input.prop("disabled", false);

    // ============================================
    // COMPONENT VISIBILITY
    // ============================================
    if (
      field.component &&
      field.component[mode] &&
      field.component[mode].hide === true
    ) {
      $wrap.hide();
      return;
    }

    // ============================================
    // PRESERVE FULL PATH (CRITICAL FIX)
    // ============================================

    // DO NOT overwrite data-cfy-field if already set
    var currentPath = $input.attr("data-cfy-field");

    if (!currentPath) {
      currentPath = field.key;
      $input.attr("data-cfy-field", currentPath);
    }

    // Safe ID from full path (replace dots with dashes)
    var safeId = currentPath.replace(/\./g, "-");
    var id = field.id || ("cfy-" + this.slug + "-" + safeId);
    $input.attr("id", id);

    var elType = String(field.el || "input").toLowerCase();

    // ============================================
    // BOOT-LEVEL CLASSES
    // ============================================
    if (elType === "input" && coreTemplates.inputClass) {
      $input.addClass(coreTemplates.inputClass);
    }

    if (elType === "textarea" && coreTemplates.textareaClass) {
      $input.addClass(coreTemplates.textareaClass);
    }

    if (elType === "select" && coreTemplates.selectClass) {
      $input.addClass(coreTemplates.selectClass);
    }

    if (coreTemplates.labelClass && $label.length) {
      $label.addClass(coreTemplates.labelClass);
    }

    // Field-level classes
    if (field.wrapperClassName) $wrap.addClass(field.wrapperClassName);
    if (field.className) $input.addClass(field.className);

    // ============================================
    // ATTRIBUTES
    // ============================================
    var attrs = field.attrs || {};
    for (var a in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, a)) continue;
      if (
        a === "data-cfy-field" ||
        a === "data-cfy-input" ||
        a === "data-cfy-action"
      ) continue;

      if (attrs[a] != null) $input.attr(a, attrs[a]);
    }

    if (field.required === true) $input.prop("required", true);
    if (field.placeholder) $input.attr("placeholder", field.placeholder);

    // IMPORTANT: handle number input properly
    if (
      $input.prop("tagName") &&
      $input.prop("tagName").toLowerCase() === "input"
    ) {
      var inputType = field.inputType || field.type || "text";
      if (field.type !== "object" && field.type !== "array") {
        $input.attr("type", inputType);
      }
    }

    // ============================================
    // LABEL
    // ============================================
    if ($label.length) {
      $label.text(field.title || "");
      if (field.showLabel === false) $label.hide();
    }

    // ============================================
    // ERROR
    // ============================================
    if ($error.length) {
      if (field.showError === false) $error.hide();
      var msg = this.state.errors[field.key];
      $error.text(msg ? String(msg) : "");
    }

    // ============================================
    // VALUE RESOLUTION (NESTED SAFE)
    // ============================================
    var value;

    if (Array.isArray(path) && path.length) {
      value = this._getNestedValue(this.state.record, path);
    } else {
      value = this.state.record ? this.state.record[field.key] : undefined;
    }

    if (elType === "checkbox") {
      $input.prop("checked", !!value);
    } else if (elType === "select") {

        // If field has options/items → normal behavior
        if (
          (Array.isArray(field.options) && field.options.length) ||
          (Array.isArray(field.items) && field.items.length) ||
          field.itemsEndpoint
        ) {
          this._applySelectItems($input, field, value, true);
        }
        else {
          // 🔥 AUTO-INJECT VALUE IF NO OPTIONS DEFINED
          $input.empty();

          if (value !== undefined && value !== null && value !== "") {
            var $opt = $("<option/>", {
              value: value,
              text: value,
              selected: true
            });

            $input.append($opt);
          }
        }
      } else {
      $input.val(value != null ? value : "");
    }

    // ============================================
    // VIEW MODE
    // ============================================
    if (mode === "view") {
      $input.prop("disabled", true);
      $wrap.addClass("cfy-readonly");
    }
  };




  CrudifyInstance.prototype._applySelectItems = function ($select, field, value, isInModal) {
    var self = this;

    // 🔥 1. Support "options" (your config uses this)
    if (Array.isArray(field.options) && field.options.length) {
      self._renderSelectOptions($select, field, field.options, value);
      return;
    }

    // 2. Support "items" (legacy support)
    if (Array.isArray(field.items) && field.items.length) {
      self._renderSelectOptions($select, field, field.items, value);
      return;
    }

    // 3. Support remote items
    if (field.itemsEndpoint) {
      var url = field.itemsEndpoint;

      if (self._itemsCache[url]) {
        self._renderSelectOptions($select, field, self._itemsCache[url], value);
        return;
      }

      $.getJSON(url)
        .done(function (resp) {
          var arr = Array.isArray(resp)
            ? resp
            : (Array.isArray(resp && resp.data) ? resp.data : []);

          self._itemsCache[url] = arr;
          self._renderSelectOptions($select, field, arr, value);
          $select.trigger("change");
        })
        .fail(function () {
          self._renderSelectOptions($select, field, [], value);
        });

      return;
    }

    // 4. Fallback (empty select)
    self._renderSelectOptions($select, field, [], value);
  };


  CrudifyInstance.prototype._renderSelectOptions = function ($select, field, items, value) {
    $select.empty();

    for (var i = 0; i < items.length; i++) {
      var mapped = _helpers.mapItem(items[i], field);

      var $opt = $("<option/>", { value: mapped.val }).text(mapped.text);

      if (mapped.attrs && _helpers.isObj(mapped.attrs)) {
        for (var a in mapped.attrs) {
          if (!Object.prototype.hasOwnProperty.call(mapped.attrs, a)) continue;
          if (mapped.attrs[a] == null) continue;
          $opt.attr(a, mapped.attrs[a]);
        }
      }

      if (value !== undefined && value !== null && String(mapped.val) === String(value)) {
        $opt.prop("selected", true);
      }

      $select.append($opt);
    }
  };

  CrudifyInstance.prototype._initPluginsForForm = function (ctx) {
    var fields = this.config.fields || {};
    var self = this;

    for (var key in fields) {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;

      var field = _helpers.normalizeField(fields[key], key);
      if (!field.plugin) continue;

      var pluginFn = self.core._plugins[field.plugin];
      if (!pluginFn) continue;

      var $el = self.$modal.find('[data-cfy-field="' + key + '"]').first();
      if (!$el.length) continue;

      try {
        pluginFn($el, field, ctx);
      } catch (e) {
        if (global.console) console.warn("[Crudify plugin error]", field.plugin, e);
      }
    }
  };

  
  CrudifyInstance.prototype.getValues = function () {
    var self = this;
    var result = {};
    var fields = this.config.fields || {};
    var $scope = this.$modal;

    function collectObject(field, basePath) {

      //==============================
      // Objects
      //==============================

      if (field.type === "object" && field.fields) {
        Object.keys(field.fields).forEach(function (k) {
          var child = _helpers.normalizeField(field.fields[k], k);
          collectObject(child, basePath.concat(k));
        });
        return;
      }

      //==============================
      // Array
      //==============================

      if (field.type === "array") {
        collectArray(field, basePath);
        return;
      }

      var pathKey = basePath.join(".");
      var $el = $scope.find('[data-cfy-field="' + pathKey + '"]').first();
      if (!$el.length) return;

      var val;

      if ($el.attr("type") === "checkbox") {
        val = $el.prop("checked");
      } else {
        val = $el.val();
      }

      self._setNestedValue(result, basePath, val);
    }

    function collectArray(field, basePath) {

      var arr = [];

      var $arrayWrap = $scope.find(".cfy-array").filter(function () {
        return $(this).find('[data-cfy-field^="' + basePath.join(".") + '"]').length;
      }).first();

      if (!$arrayWrap.length) {
        self._setNestedValue(result, basePath, []);
        return;
      }

      $arrayWrap.find(".cfy-array-item").each(function () {

        var $item = $(this);

        // OBJECT ARRAY
        if (field.fields) {

          var obj = {};
          var hasValue = false;

          Object.keys(field.fields).forEach(function (k) {

            var $input = $item.find('[data-cfy-field$=".' + k + '"]');
            if (!$input.length) return;

            var val = $input.val();

            if (val !== undefined && val !== null && val !== "") {
              obj[k] = val;
              hasValue = true;
            } else {
              obj[k] = val;
            }

          });

          if (hasValue) {
            arr.push(obj);
          }

        } else {

          // PRIMITIVE ARRAY
          var $input = $item.find("[data-cfy-input]").first();
          if (!$input.length) return;

          var val = $input.val();

          if (val !== undefined && val !== null && val !== "") {
            arr.push(val);
          }
        }

      });

      self._setNestedValue(result, basePath, arr);
    }

    Object.keys(fields).forEach(function (key) {
      var field = _helpers.normalizeField(fields[key], key);
      collectObject(field, [key]);
    });

    return result;
  };


  CrudifyInstance.prototype._getNestedValue = function (obj, path) {
    return path.reduce(function (acc, key) {
      return acc && acc[key] != null ? acc[key] : undefined;
    }, obj);
  };

  CrudifyInstance.prototype._setNestedValue = function (obj, path, value) {
    var ref = obj;
    for (var i = 0; i < path.length - 1; i++) {
      if (!ref[path[i]]) ref[path[i]] = {};
      ref = ref[path[i]];
    }
    ref[path[path.length - 1]] = value;
  };
  /* ---------------------------
     Save/Delete flows
  ---------------------------- */

  CrudifyInstance.prototype.saveModal = function () {
    var payload = this.getValues();
    var self = this;

    var req;

    if (this.state.mode === "edit") {

      // 🔥 get id from state.record — not from form
      var id = this.state.record._id || this.state.record.id;

      if (!id) {
        console.warn("Crudify: Cannot update — missing record ID");
        return;
      }

      req = this.updateRecord(id, payload);

    } else {

      // create mode
      req = this.createRecord(payload);

    }

    req.done(function () {
      self.closeModal();
      self.reload();
    });
  };

  CrudifyInstance.prototype.confirmDelete = function (id) {
    var self = this;
    if (!id) return;
    if (!global.confirm("Delete this record?")) return;

    self.deleteRecord(id).done(function () {
      self.reload();
    });
  };

  /* ---------------------------
     Events (single delegated binder)
  ---------------------------- */

  CrudifyInstance.prototype._bindEvents = function () {
    var self = this;

    self.$root.off(".crudify");
    self.$modal.off(".crudify");

    self.$root.on("click.crudify", "[data-cfy-action]", function () {
      var $btn = $(this);
      var action = $btn.attr("data-cfy-action");
      var id = $btn.attr("data-cfy-id");

      if (action === "create" && self.components.create !== false) self.openCreate();
      if (action === "edit" && self.components.edit !== false) self.openEdit(id);
      if (action === "view" && self.components.view !== false) self.openView(id);
      if (action === "delete" && self.components.delete !== false) self.confirmDelete(id);

      if (action === "reload") self.reload();

      if (action === "page") {
        var p = parseInt($btn.attr("data-cfy-page"), 10);
        if (!isNaN(p) && p >= 1) {
          self.state.page = p;
          self.reload();
        }
      }
    });

    self.$modal.on("click.crudify", "[data-cfy-action]", function () {
      var action = $(this).attr("data-cfy-action");
      if (action === "closeModal") self.closeModal();
      if (action === "save") self.saveModal();
    });

    self.$modal.on("click.crudify", "[data-cfy-overlay]", function (e) {
      if ($(e.target).is("[data-cfy-overlay]")) self.closeModal();
    });

    // =============================
    // SEARCH EVENT
    // =============================
    var searchTimeout;

    self.$root.on("input.crudify", "[data-cfy-search]", function () {
      var val = $(this).val();

      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(function () {
        self.state.search = val;
        self.state.page = 1; // reset page
        self.reload();
      }, 400);
    });
  };


  /* =========================================================
     Public API
  ========================================================= */
  var crudify = {
    _helpers: _helpers,
    _renderers: _renderers,
    _plugins: _plugins,
    _instances: {},
    _templates: {},
    _config: {},

    boot: function (config) {
      config = config || {};
      this._config = config;
      this._templates = config.templates || {};

      // console.log("this._templates ==> ", this._templates);
      
      // plugins config can be used by user; we keep registerPlugin explicit in v1
      return this;
    },

    mount: function (config) {
      if (!config || !config.el) throw new Error("crudify.mount: el is required");
      if (!config.name) throw new Error("crudify.mount: name is required");
      if (!config.endpoint && !config.endpoints) throw new Error("crudify.mount: endpoint or endpoints is required");

      // defaults
      if (config.pagination == null) config.pagination = true;

      var inst = new CrudifyInstance(this, config);
      this._instances[config.name] = inst;
      inst.init();
      return inst;
    },

    getInstance: function (name) {
      return this._instances[name] || null;
    },

    reload: function (name) {
      var inst = this.getInstance(name);
      if (inst) return inst.reload();
    },

    destroy: function (name) {
      var inst = this._instances[name];
      if (inst) {
        if (inst.$modal) inst.$modal.remove();
        if (inst.$root) inst.$root.remove();
      }
      delete this._instances[name];
    },

    registerRenderer: function (name, fn) {
      if (!name) throw new Error("registerRenderer: name required");
      if (typeof fn !== "function") throw new Error("registerRenderer: fn must be a function");
      this._renderers[String(name).toLowerCase().trim()] = fn;
    },

    registerPlugin: function (name, fn) {
      if (!name) throw new Error("registerPlugin: name required");
      if (typeof fn !== "function") throw new Error("registerPlugin: fn must be a function");
      this._plugins[name] = fn;
    }
  };

  global.crudify = crudify;

})(window, window.jQuery);
