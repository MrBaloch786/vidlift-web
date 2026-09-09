// ==UserScript==
// @name        SaveFrom.net helper
// @namespace   http://savefrom.net/
// @version     2.70
// @date        2014-07-12
// @author      Magicbit, Inc
// @description Youtube Downloader: all in one script to get Vimeo, Facebook, Dailymotion videos for free
// @homepage    http://savefrom.net/user.php?helper=userjs
// @icon        http://savefrom.net/img/extension/icon_16.png
// @icon64      http://savefrom.net/img/extension/icon_64.png
// @updateURL   https://sf-addon.com/helper/chrome/helper.meta.js
// @downloadURL https://sf-addon.com/helper/chrome/helper.user.js
// @include     http://*
// @include     https://*
// @exclude     *://google.*/*
// @exclude     *://*.google.*/*
// @exclude     *://acidtests.org/*
// @exclude     *://*.acidtests.org/*
// @run-at      document-end
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_xmlhttpRequest
// @grant       GM_info
// @grant       GM_openInTab
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @grant       GM_notification
// @grant       GM_download
// ==/UserScript==

(function(){

if(!window.GM_getValue)
  return;

if(window.sessionStorage) {
  sessionStorage['savefrom-helper-userjs'] = '1';
}

var chrome, _menu, _options, _background, SaveFrom_Utils, _moduleHosts, _modules;

/////////////////////////////////////////////////
// CHROME

chrome = {
  app: {
    getDetails: function(){
      if(GM_info && GM_info.script)
        return GM_info.script;

      return {};
    }
  },

  browserAction: {
    setIcon: function(icon){},
    setTitle: function(title){},
  },

  tabs: {
    getSelected: function(winId, cb){
      cb({
        id: 1,
        url: location.href
      });
    },

    query: function(queryInfo, cb){
      cb([]);
    },

    create: function(options){
      GM_openInTab(options.url, {
        active: options.selected || options.active,
        insert: true
      });
    },

    sendRequest: function(id, request, callback){
      if(!chrome.extension.moduleRequestHandler)
        return;

      chrome.extension.moduleRequestHandler(request, {}, callback);
    },

    onRemoved: {
      addListener: function(){}
    }
  },

  extension: {
    requestHandler: null,
    moduleRequestHandler: null,

    onRequest: {
      addListener: function(cb){
        if(!chrome.extension.requestHandler)
        {
          chrome.extension.requestHandler = cb;
          return;
        }

        chrome.extension.moduleRequestHandler = cb;
      }
    },

    sendRequest: function(request, callback)
    {
      if(!chrome.extension.requestHandler)
      {
        callback();
        return;
      }

      var sender = {
        moduleName: request.moduleName,
        tab: {
          id: 1,
          url: location.href
        }
      };

      chrome.extension.requestHandler(request, sender, callback);
    }
  },

  i18n: {
    lang: 'en',
    messages: {en: {}},

    detectUserLanguage: function()
    {
      var lang = window.navigator.userLanguage || window.navigator.language;
      if(lang && this.messages[lang])
        this.lang = lang;

      return this.lang;
    },

    getMessage: function(msg_id)
    {
      var m = this.messages[this.lang];
      if(m && m[msg_id] && m[msg_id].message)
        return m[msg_id].message;

      return '';
    },

    translate: function(parent)
    {
      parent = parent || document;
      var e_list = parent.querySelectorAll('*[data-i18n]');
      for(var i = 0, len = e_list.length; i < len; i++)
      {
        var el = e_list[i];
        el.innerText = chrome.i18n.getMessage(el.dataset.i18n);
      }
    }
  },

  downloads: {
    download: function(options, cb) {
      if (!window.GM_download) {
        return;
      }

      var gm_options = {};
      gm_options.url = options.url;
      gm_options.name = options.filename;
      gm_options.headers = options.headers;
      gm_options.saveAs = !!(options.saveAs);
      gm_options.onload = function() {
        cb(true);
      };
      gm_options.onerror = cb;
      GM_download(gm_options);
    }
  }
};

/////////////////////////////////////////////////
// MENU
_menu = {
  activeDataAttr: 'data-sfh-active',
  id: 'sfh--ujs-menu',
  tooltipId: 'sfh--ujs-menu-tooltip',
  enabled: true,
  active: false,
  hover: false,
  title: '',
  items: [],
  shakeTimer: 0,
  shakeInterval: 10000,

  menu: null,
  icon: null,

  style: {
    menu: {
      initial: {
        background: '#fff',
        borderStyle: 'solid',
        borderWidth: '2px 0 2px 2px',
        borderRadius: '5px 0 0 5px',
        display: 'none',
        boxSizing: 'content-box',
        font: '13px/18px Arial,Helvetica,sans-serif',
        width: 'auto',
        height: 'auto',
        padding: 0,
        margin: 0,
        overflow: 'visible',
        position: 'fixed',
        top: '50px',
        right: '0',
        textAlign: 'left',
        WebkitTransition: 'all 0.2s',
        transition: 'all 0.2s',
        zIndex: 99999,
        cursor: 'pointer'
      },

      enabled: {
        borderColor: '#8dc50b'
      },

      disabled: {
        borderColor: '#d0d0d0'
      },

      tag: {
        display: 'block',
        width: '10px',
        height: '20px',
        overflow: 'hidden',
        opacity: 0.5
      },

       tagHover: {
        width: '20px',
        opacity: 0.8
      },

      active: {
        width: 'auto',
        height: 'auto',
        overflow: 'visible',
        opacity: 0.9
      }
    },

    icon: {
      initial: {
        display: 'inline-block',
        boxSizing: 'content-box',
        backgroundPosition: '50% 50%',
        backgroundRepeat: 'no-repeat',
        width: '16px',
        height: '16px',
        margin: 0,
        padding: '2px',
        overflow: 'hidden',
        verticalAlign: 'middle'
      },

      enabled: {
        backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA3XAAAN1wFCKJt4AAACOklEQVQ4y42TTWgTURSFz3sv00maJqVWg6LiD7VUdGERQQnoQlS6sStxVVBULE0XoiDFjejChaC4qCCIKBQE0U1XpYoLFX9AXLbVVhR/UInGTjKZeTOTee+6aKdO2iAeuJvDd8+73MtjRIRIT2ud5d3GdOsLdP0150VEyLN3LGIiPxGHPE8RDEApAkCLAuboiInE45ArwxIAhKHWWhPiFYak40zdBCMzazpyy9btcsuoIAcEUktuIB0HVUASScAtozIu8n3F359e9m36+j4BAHa1erzqTB7mjK0HAE8qaVB9QOBBAoDt2tvKzuRFIroHYIgDwEC3NWQV3YJlyZn5ADcIFOLlS+UCgGXJGavoFga6rSEAYPErRLozsXqqOUtddfsp4+2Rrd82L2YTDz53nDST2Q1ps42STZlmVdMrBGvmQa1SBwqe5c8qB+8Kg//0Att1/Fnme5WPbHgq026qpjEh2A4A4Ew4XBh2GHor615KJH9oVctoUmkAUIpe+yLoYUSECw8zufZ2MWoYfCf+Q7WaflUqqd7z++3iwg4ujadXpVr4fcPk+X82+/q5rOpD5w4435cs8cwoW7s8mxoxTb6nUbPv6ye/KrLvSi99ibwlVzh9m23M5MwbqTTfF/elox/ZRb//6lH6EPcbnnHwJutsaRPX0q2iBwCcshqrzqpTwydoejHbMAAABq+zLSLDLgOAsunscIEmGnELAYwxBoABEABMAKm9x7AdAB7fwhsAEoAPQM397rnGP/fQK/eKCl8BAAAAAElFTkSuQmCC)'
      },

      disabled: {
        backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAiNJREFUeNqMkj+oUlEcx7/nHu/V7lMTxaghqIgoWpIQisCmhjfloDS9QQgMHkpTODc2hS45OQRB6GCLb2hqiAIJpzB6UUhDkqi34/17rtfTonI1ifeDs/zO5/eB8/0dwhjDqjRN+xOLxU4bhiGwVUIIhMNhsmJW/YAfsm1bAIDnedgl8DM7BYZhjAHAdd0FpVTy383n84Wf2RD0er3L8Xj8tq7rDAAcx7EopXtbAgsAdF1ng8HgYDKZfEilUt8CADCbzR7quv5AkqQLAGBZlhUMBjcEjuOsBDcYY0+FEK8BVCQAyGQylel0eqhp2vHynSbnHP5j27a5DPp4Op0eZjKZCgAQ/xZW1e12++Fw+Kq/p+v6l3Q6fW2bDfT7/aKiKBdDoZBQFEX1PC9JCJE45xsgIUQaDoevKKUjzrlp2zbhnP8gnU4nIcvyEaU0vQQNSZJmnued9QsopcPFYhERQuwtV911XXefMMbQbDbPJJPJN7Is38IJynXdj6PR6H4+n/+9zqDdbp9TVbWpKMqd/w1zzt+bppnPZrO//gmx0WicTyQSL0Oh0N1dw7ZtvxuPxweFQuHnOpvtLdTr9UuxWOyFqqr3/H3TNN9qmvaoWCx+3wh31xprtdqVaDT6PBKJ7C8/2hFj7HGpVPq6ze4UAEC1Wr0uy/KzZWhPyuXy513cWhCNRgkAAoACCAI4lcvlbgJAq9X6BMAC4ADwAAjGmACAvwMAXX8khNE72VIAAAAASUVORK5CYII=)'
      },

      tag: {padding: '2px'},
      active: {padding: '5px'}
    },

    title: {
      display: 'inline-block',
      font: 'bold 13px/18px Arial,Helvetica,sans-serif',
      lineHeight: '26px',
      margin: 0,
      padding: 0,
      textAlign: 'left',
      verticalAlign: 'middle'
    },

    itemsBox: {
      display: 'block',
      margin: 0,
      padding: 0
    },

    item: {
      color: '#000',
      backgroundColor: '#fff',
      border: 'none',
      boxSizing: 'content-box',
      font: 'normal 13px/18px Arial,Helvetica,sans-serif',
      margin: '2px',
      padding: '2px 3px',
      position: 'relative',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      cursor: 'pointer'
    },

    itemHover: {
      backgroundColor: '#f9f9f9',
      border: '1px solid #d0d0d0',
      borderRadius: '3px',
      padding: '1px 2px'
    },

    itemSep: {
      backgroundColor: '#d0d0d0',
      border: 'none',
      borderRadius: 0,
      boxSizing: 'content-box',
      height: '1px',
      lineHeight: '1px',
      margin: '5px',
      padding: '0',
      cursor: 'default'
    }
  },

  addItem: function(id, title, fn)
  {
    if(!title)
      title = '-';

    return this.items.push({id: id, title: title, fn: fn});
  },

  resetItems: function()
  {
    this.items = [];
  },

  setTitle: function(title, version)
  {
    this.title = title;
    if(version)
      this.title += ' ' + version;
  },

  create: function(enabled){
    if(this.menu || !document.body)
      return;

    if(!this.items)
      return;

    var _this = this;

    var menu = document.createElement('div');

    menu.addEventListener('mouseover', function(){
      if(!_this.active)
      {
        _this.hover = true;
        _this.setElementsStyle('tagHover');
      }
    });

    menu.addEventListener('mouseout', function(){
      if(!_this.active)
      {
        _this.hover = false;
        _this.setElementsStyle('tag');
      }
    });

    var icon = document.createElement('div');
    icon.title = this.title;

    icon.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();

      if(event.button === 0)
      {
        _this.toggleMenuItems();
      }
      else if(event.button == 2)
      {
        _this.remove();
      }

      return false;
    }, false);

    icon.addEventListener('contextmenu', function(event){
      event.preventDefault();
      event.stopPropagation();
      _this.remove();
      return false;
    }, false);

    this.icon = menu.appendChild(icon);
    this.menu = document.body.appendChild(menu);

    this.setElementsStyle('initial');
    this.setEnabled(enabled);
    this.showTag();

    if(this.isNewUser())
    {
      this.shakeTimer = setTimeout(function(){_this.shakeTag();}, this.shakeInterval);
    }
  },

  setStyle: function(element, style)
  {
    if(this[element] && this.style[element] && this.style[element][style])
      SaveFrom_Utils.setStyle(this[element], this.style[element][style]);
  },

  setElementsStyle: function(style)
  {
    if(!style)
      return;

    var elements = ['menu', 'icon'];

    for(var i = 0; i < elements.length; i++)
      this.setStyle(elements[i], style);
  },

  setEnabled: function(enabled)
  {
    this.enabled = enabled;
    this.setElementsStyle(this.enabled ? 'enabled' : 'disabled');
  },

  showTag: function()
  {
    this.setElementsStyle('tag');
  },

  toggleMenuItems: function()
  {
    return _menu.active ? _menu.hideMenuItems() : _menu.showMenuItems();
  },

  remove: function()
  {
    if(_menu.menu)
      _menu.menu.parentNode.removeChild(_menu.menu);

    _menu.removeTooltip();
  },

  showMenuItems: function()
  {
    if(this.active)
      return;

    this.removeActiveItems();

    var title = this.createTitle();
    if(title)
      this.menu.appendChild(title);

    var items = this.createItems();
    if(items)
      this.menu.appendChild(items);

    this.active = true;
    this.setElementsStyle('active');

    document.addEventListener('click', this.onDocumentClick, false);
    document.addEventListener('keydown', this.onDocumentKeyDown, false);

    if(this.isNewUser())
    {
      GM_setValue('newUser', '0');
      this.showTooltip();
    }
  },

  hideMenuItems: function()
  {
    this.removeTooltip();
    this.removeActiveItems();
    document.removeEventListener('click', this.onDocumentClick, false);
    document.removeEventListener('keydown', this.onDocumentKeyDown, false);

    this.active = false;
    this.showTag();
  },

  onDocumentClick: function(event)
  {
    var node = event.target;
    if(node != _menu.menu && !SaveFrom_Utils.isParent(node, _menu.menu))
    {
      _menu.hideMenuItems();
    }
  },

  onDocumentKeyDown: function(event)
  {
    if(event.keyCode == 27)
    {
      _menu.hideMenuItems();
    }
  },

  removeActiveItems: function()
  {
    var e = null;
    while(e = this.menu.querySelector('div[' + this.activeDataAttr + ']'))
    {
      e.parentNode.removeChild(e);
    }
  },

  createTitle: function()
  {
    var _this = this;

    if(!this.title)
      return null;

    var title = document.createElement('div');
    title.innerHTML = this.title;
    title.setAttribute(this.activeDataAttr, '1');
    SaveFrom_Utils.setStyle(title, this.style.title);

    title.addEventListener('click', function(event){
      if(event.button === 0)
      {
        event.preventDefault();
        event.stopPropagation();
        _this.toggleMenuItems();
        return false;
      }
    });

    return title;
  },

  createItems: function()
  {
    if(!this.items)
      return;

    var box = document.createElement('div');
    box.setAttribute(this.activeDataAttr, '1');
    SaveFrom_Utils.setStyle(box, this.style.itemsBox);

    for(var i = 0; i < this.items.length; i++)
    {
      this.createItem(this.items[i], box);
    }

    return box;
  },

  createItem: function(data, parent)
  {
    var _this = this,
         item = document.createElement('div');

    if(!data.title || data.title == '-')
    {
      SaveFrom_Utils.setStyle(item, this.style.itemSep);
    }
    else if(data.fn)
    {
      item.innerHTML = data.title;
      SaveFrom_Utils.setStyle(item, this.style.item);

      item.addEventListener('mouseover', function(){
        SaveFrom_Utils.setStyle(this, _this.style.itemHover);
      });

      item.addEventListener('mouseout', function(){
        SaveFrom_Utils.setStyle(this, _this.style.item);
      });

      item.addEventListener('click', function(event){
        if(event.button === 0)
        {
          event.preventDefault();
          event.stopPropagation();
          _this.hideMenuItems();
          data.fn(data.id, data.title);
          return false;
        }
      });
    }

    parent.appendChild(item);
  },

  isNewUser: function()
  {
    return GM_getValue('newUser') == '1';
  },

  shakeTag: function()
  {
    clearTimeout(this.shakeTag);

    if(!this.enabled || this.active || !this.isNewUser())
      return;

    if(this.hover)
    {
      this.shakeTimer = setTimeout(function(){_menu.shakeTag();}, _menu.shakeInterval);
      return;
    }

    var style = 'tagHover', counter = 0;

    function step()
    {
      SaveFrom_Utils.setStyle(_menu.menu, _menu.style.menu[style]);
      style = (style == 'tagHover') ? 'tag' : 'tagHover';

      if(counter++ < 3)
      {
        setTimeout(step, 100);
        return;
      }

      _menu.shakeTimer = setTimeout(function(){_menu.shakeTag();}, _menu.shakeInterval);
    }

    step();
  },

  removeTooltip: function()
  {
    var e = document.getElementById(this.tooltipId);
    if(e)
      e.parentNode.removeChild(e);
  },

  showTooltip: function()
  {
    var menuSize = SaveFrom_Utils.getSize(this.menu);

    var t = document.createElement('div');
    t.id = this.tooltipId;
    SaveFrom_Utils.setStyle(t, {
      border: 'none',
      display: 'block',
      boxSizing: 'content-box',
      width: '280px',
      height: 'auto',
      padding: 0,
      margin: 0,
      overflow: 'visible',
      position: 'fixed',
      top: '50px',
      right: menuSize.width + 10 + 'px',
      WebkitTransition: 'all 0.2s',
      transition: 'all 0.2s',
      zIndex: 99999,
      opacity: 0
    });

    var cnt = document.createElement('div');
    cnt.innerHTML = chrome.i18n.getMessage("menuTooltip");
    SaveFrom_Utils.setStyle(cnt, {
      color: '#000',
      background: '#fdeca6',
      border: '1px solid #b3a77d',
      borderRadius: '5px',
      display: 'block',
      boxSizing: 'content-box',
      font: '13px/18px Arial,Helvetica,sans-serif',
      padding: '10px',
      margin: 0,
      position: 'relative',
      textAlign: 'left'
    });

    var arrow = document.createElement('div');
    SaveFrom_Utils.setStyle(arrow, {
      background: '#fdeca6',
      borderRight: '1px solid #b3a77d',
      borderBottom: '1px solid #b3a77d',
      boxSizing: 'content-box',
      position: 'absolute',
      top: '10px',
      right: '-7px',
      width: '10px',
      height: '10px',
      WebkitTransform: 'rotate(-45deg)'
    });

    cnt.appendChild(arrow);
    t.appendChild(cnt);
    document.body.appendChild(t);
    t.style.opacity = '0.9';
  }
};
/////////////////////////////////////////////////
// OPTIONS
_options = {
  classPrefix: 'sfh--',
  dataAttr: 'data-sfh-option',
  html: 'PHN0eWxlIHR5cGU9InRleHQvY3NzIj4KLnNmaC0tb3B0aW9uc3tiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7Ym9yZGVyOm5vbmU7Zm9udDoxM3B4LzEgQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7d2lkdGg6NTgwcHg7bWFyZ2luOjA7cGFkZGluZzo5cHg7dGV4dC1hbGlnbjpsZWZ0fS5zZmgtLW9wdGlvbnMgLnNmaC0tdGl0bGV7Zm9udC1zaXplOjEuM2VtO21hcmdpbjowIDAgMS4zZW0gMH0KLnNmaC0tb3B0aW9ucyBmb3Jte21hcmdpbjowO3BhZGRpbmc6MH0KLnNmaC0tb3B0aW9ucyBsYWJlbHtkaXNwbGF5OmJsb2NrO21hcmdpbjouMmVtIDA7cGFkZGluZzowO3RleHQtYWxpZ246bGVmdH0KLnNmaC0tb3B0aW9ucyAuc2ZoLS1pbmxpbmUtY29udGVudCBsYWJlbHtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tbGVmdDoxMHB4fQouc2ZoLS1vcHRpb25zIC5zZmgtLWZsZWZ0e2Zsb2F0OmxlZnR9Ci5zZmgtLW9wdGlvbnMgLnNmaC0tZmwtY29sdW1ue2Zsb2F0OmxlZnQ7bWFyZ2luLXJpZ2h0OjIwcHh9Ci5zZmgtLW9wdGlvbnMgLnNmaC0tY2xlYXJ7Y2xlYXI6Ym90aDtoZWlnaHQ6MDtmb250LXNpemU6MDtsaW5lLWhlaWdodDowfQouc2ZoLS1vcHRpb25zIC5zZmgtLWJsb2Nre2JvcmRlci10b3A6MXB4IHNvbGlkICNkZmUxZTg7cGFkZGluZzoxLjVlbSAwIDAgMDttYXJnaW46MS41ZW0gMCAwIDA7bWluLXdpZHRoOjE2MHB4fQouc2ZoLS1vcHRpb25zIC5zZmgtLWJsb2NrLXRpdGxle2ZvbnQtd2VpZ2h0OmJvbGQ7bWFyZ2luLWJvdHRvbTouNWVtfQouc2ZoLS1vcHRpb25zIC5zZmgtLW1vZHVsZXtmb250LXdlaWdodDpib2xkO21hcmdpbi10b3A6MWVtfS5zZmgtLW9wdGlvbnMgLnNmaC0tbW9kdWxlOmZpcnN0LWNoaWxke21hcmdpbi10b3A6MH0KLnNmaC0tb3B0aW9ucyAuc2ZoLS1tb2R1bGVfb3B0aW9uc3tmb250LXNpemU6LjllbTtmb250LXdlaWdodDpub3JtYWw7bWFyZ2luLWxlZnQ6MmVtfQoKPC9zdHlsZT4KPGRpdiBjbGFzcz0ic2ZoLS1vcHRpb25zIj4KICA8ZGl2IGNsYXNzPSJzZmgtLXRpdGxlIiBkYXRhLWkxOG49Im9wdGlvbnNUaXRsZSI+U2F2ZUZyb20ubmV0IEhlbHBlciAtIFByZWZlcmVuY2VzPC9kaXY+CgogIDxmb3JtPgogICAgPGRpdiBjbGFzcz0ic2ZoLS1ibG9jayI+CiAgICAgIDxkaXYgZGF0YS1pMThuPSJvcHRpb25zSGFuZGxlTGlua3MiIGNsYXNzPSJzZmgtLWJsb2NrLXRpdGxlIj5IYW5kbGUgbGlua3M8L2Rpdj4KICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgZGF0YS1zZmgtb3B0aW9uPSJsbUZpbGVIb3N0aW5nIiBjaGVja2VkPSIxIj4mbmJzcDs8c3BhbiBkYXRhLWkxOG49Im9wdGlvbnNGaWxlSG9zdGluZ3MiPlRvIGZpbGVob3N0aW5nczwvc3Bhbj48L2xhYmVsPgogICAgICA8bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249ImxtTWVkaWFIb3N0aW5nIiBjaGVja2VkPSIxIj4mbmJzcDs8c3BhbiBkYXRhLWkxOG49Im9wdGlvbnNNZWRpYUhvc3RpbmdzIj5UbyBtZWRpYWhvc3RpbmdzPC9zcGFuPjwvbGFiZWw+CiAgICA8L2Rpdj4KCiAgICA8ZGl2IGNsYXNzPSJzZmgtLWJsb2NrIj4KICAgICAgPGRpdiBkYXRhLWkxOG49Im9wdGlvbnNNb2R1bGVzIiBjbGFzcz0ic2ZoLS1ibG9jay10aXRsZSI+TW9kdWxlczwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJzZmgtLXlvdXR1YmVfYm94IiBjbGFzcz0ic2ZoLS1tb2R1bGUiPjxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGRhdGEtc2ZoLW9wdGlvbj0ibW9kdWxlWW91dHViZSIgY2hlY2tlZD0iMSI+Jm5ic3A7PHNwYW4gZGF0YS1pMThuPSJvcHRpb25zWW91dHViZSI+WW91VHViZTwvc3Bhbj48L2xhYmVsPgogICAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlX29wdGlvbnMiPgogICAgICAgICAgPGRpdiBjbGFzcz0ic2ZoLS1mbC1jb2x1bW4iPjxzcGFuIGRhdGEtaTE4bj0ib3B0aW9uc1lUSGlkZUxpbmtzIj5IaWRlIGxpbmtzPC9zcGFuPjo8L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InNmaC0tZmxlZnQgc2ZoLS1pbmxpbmUtY29udGVudCI+CiAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGRhdGEtc2ZoLW9wdGlvbj0ieXRIaWRlRkxWIiBjaGVja2VkPSIwIj4mbmJzcDtGTFY8L2xhYmVsPgogICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Inl0SGlkZU1QNCIgY2hlY2tlZD0iMCI+Jm5ic3A7TVA0PC9sYWJlbD4KICAgICAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgZGF0YS1zZmgtb3B0aW9uPSJ5dEhpZGVXZWJNIiBjaGVja2VkPSIxIj4mbmJzcDtXZWJNPC9sYWJlbD4KICAgICAgICAgICAgPGJyPgogICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Inl0SGlkZTNHUCIgY2hlY2tlZD0iMSI+Jm5ic3A7M0dQPC9sYWJlbD4KICAgICAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgZGF0YS1zZmgtb3B0aW9uPSJ5dEhpZGUzRCIgY2hlY2tlZD0iMSI+Jm5ic3A7M0Q8L2xhYmVsPgogICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Inl0SGlkZU1QNE5vQXVkaW8iIGNoZWNrZWQ9IjEiPiZuYnNwO01QNCZuYnNwOyhubyZuYnNwO2F1ZGlvKTwvbGFiZWw+CiAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGRhdGEtc2ZoLW9wdGlvbj0ieXRIaWRlQXVkaW9fTVA0IiBjaGVja2VkPSIxIj4mbmJzcDtBdWRpbzwvbGFiZWw+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InNmaC0tY2xlYXIiPjwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZURhaWx5bW90aW9uIiBjaGVja2VkPSIxIj4mbmJzcDs8c3BhbiBkYXRhLWkxOG49Im9wdGlvbnNEYWlseW1vdGlvbiI+RGFpbHltb3Rpb248L3NwYW4+PC9sYWJlbD48L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZVZpbWVvIiBjaGVja2VkPSIxIj4mbmJzcDs8c3BhbiBkYXRhLWkxOG49Im9wdGlvbnNWaW1lbyI+VmltZW88L3NwYW4+PC9sYWJlbD48L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZUZhY2Vib29rIiBjaGVja2VkPSIxIj4mbmJzcDs8c3BhbiBkYXRhLWkxOG49Im9wdGlvbnNGYWNlYm9vayI+RmFjZWJvb2s8L3NwYW4+PC9sYWJlbD48L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZVNvdW5kY2xvdWQiIGNoZWNrZWQ9IjEiPiZuYnNwOzxzcGFuIGRhdGEtaTE4bj0ib3B0aW9uc1NvdW5kY2xvdWQiPlNvdW5kQ2xvdWQ8L3NwYW4+PC9sYWJlbD48L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZVZrb250YWt0ZSIgY2hlY2tlZD0iMSI+Jm5ic3A7PHNwYW4gZGF0YS1pMThuPSJvcHRpb25zVmtvbnRha3RlIj5WSzwvc3Bhbj48L2xhYmVsPgogICAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlX29wdGlvbnMiPjxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGRhdGEtc2ZoLW9wdGlvbj0idmtTaG93Qml0cmF0ZSIgY2hlY2tlZD0iMCI+Jm5ic3A7PHNwYW4gZGF0YS1pMThuPSJvcHRpb25zQml0cmF0ZSI+U2hvdyBiaXRyYXRlIGluc3RhbnRseTwvc3Bhbj48L2xhYmVsPjwvZGl2PgogICAgICA8L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InNmaC0tbW9kdWxlIj48bGFiZWw+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBkYXRhLXNmaC1vcHRpb249Im1vZHVsZU9kbm9rbGFzc25pa2kiIGNoZWNrZWQ9IjEiPiZuYnNwOzxzcGFuIGRhdGEtaTE4bj0ib3B0aW9uc09kbm9rbGFzc25pa2kiPk9kbm9rbGFzc25pa2k8L3NwYW4+PC9sYWJlbD48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2ZoLS1jbGVhciI+PC9kaXY+CiAgPC9mb3JtPgo8L2Rpdj4=',

  init: function()
  {
    var _this = this,
        parent = document.querySelector('.sfh--options');

    if(!parent)
      return;

    chrome.i18n.translate(parent);
    if(GM_getValue('lite') == '1')
      this.hideBlock('youtube_box', true);

    var c = parent.querySelectorAll('form input[type="checkbox"]');
    for(var i = 0; i < c.length; i++)
    {
      var name = c[i].getAttribute(this.dataAttr);
      if(name && GM_getValue(name))
      {
        c[i].checked = (GM_getValue(name) == '0') ? false : true;
        c[i].addEventListener('change', function onCbChange(event){
          var e = event.target, name = e.getAttribute(_this.dataAttr);
          GM_setValue(name, e.checked ? '1' : '0');
        }, false);
      }
    }
  },

  hideBlock: function(name, hide)
  {
    var node = document.querySelector('.' + this.classPrefix + name);
    if(node)
      node.style.display = hide ? 'none' : '';
  },

  show: function()
  {
    SaveFrom_Utils.popupDiv(atob(this.html), null, 640, 600);
    this.init();
  }
};
/////////////////////////////////////////////////
// BACKGROUND

_background = function(){
var infoPageActive = true;

var helper = getHelperName();
GM_setValue('helper', helper);
var lite = (helper == 'chromelite');
GM_setValue('lite', lite ? '1' : '0');

// default preferences
var default_preferences = {
  version: 0,
  enable: 1,
  newUser: 1,
  lmFileHosting: 1,
  lmMediaHosting: 1,
  moduleYoutube: 1,
  moduleDailymotion: 1,
  moduleVimeo: 1,
  moduleFacebook: 1,
  moduleSoundcloud: 1,
  moduleVkontakte: 1,
  moduleOdnoklassniki: 1,
  moduleShowDownloadInfo: 1,
  ytHideFLV: 0,
  ytHideMP4: 0,
  ytHideWebM: 1,
  ytHide3GP: 1,
  ytHide3D: 1,
  ytHideMP4NoAudio: 1,
  ytHideAudio_MP4: 1,
  vkShowBitrate: 0
};

var pref_names = {
  youtube: 'moduleYoutube',
  dailymotion: 'moduleDailymotion',
  vimeo: 'moduleVimeo',
  facebook: 'moduleFacebook',
  soundcloud: 'moduleSoundcloud',
  vk: 'moduleVkontakte',
  odnoklassniki: 'moduleOdnoklassniki'
};

var menuCommands = [
  {
    id: 'downloadFromCurrentPage',
    command: downloadFromCurrentPage,
    modules: ['lm', 'youtube', 'soundcloud', 'dailymotion']
  },

  {
    id: '',
    modules: ['lm', 'youtube', 'soundcloud', 'dailymotion']
  },

  {
    id: 'updateLinks',
    notify: 'updateLinksNotification',
    modules: ['vk', 'odnoklassniki', 'facebook', 'lm']
  },

  {
    id: 'downloadMP3Files',
    modules: ['vk']
  },

  {
    id: 'downloadPlaylist',
    modules: ['vk']
  },

  {
    id: 'downloadPhotos',
    modules: ['vk']
  },

  {
    id: '',
    modules: ['vk', 'odnoklassniki', 'facebook', 'lm']
  },

  {
    id: 'showOptions',
    command: showOptions,
    always: true
  },

  {
    id: 'reportBug',
    command: reportBug,
    always: true
  },

  {
    id: '',
    always: true
  },

  {
    id: 'disable',
    command: enableExtension,
    always: true
  }
];

// localStorage == widget.preferences
for (var k in default_preferences)
{
  if(GM_getValue(k) === undefined)
    GM_setValue(k, default_preferences[k]); // set default preference
}

function registerModuleMenuCommand(params, enabled)
{
  if(!params.id)
  {
    // separator
    _menu.addItem();
    return;
  }

  var strId = params.id;
  if(!enabled && params.id == 'disable')
    strId = 'menuEnable';

  var name = chrome.i18n.getMessage(strId);
  if(!name)
    return;

  if(params.command)
  {
    GM_registerMenuCommand(name, params.command);
    _menu.addItem(params.id, name, params.command);
    return;
  }

  var fn = function(){
    chrome.tabs.sendRequest(1, {action: params.id});

    if(params.notify)
      GM_notification(chrome.i18n.getMessage(params.notify), null, null, null, 3000);
  };

  GM_registerMenuCommand(name, fn);
  _menu.addItem(params.id, name, fn);
}

function registerMenuCommands(moduleName, enabled)
{
  _menu.resetItems();

  for(var i = 0; i < menuCommands.length; i++)
  {
    var item = menuCommands[i];

    if(item.gmId)
    {
      continue;
      GM_unregisterMenuCommand(item.gmId);
    }

    if(enabled || item.always)
    {
      if(!item.modules || item.modules.indexOf(moduleName) > -1)
      {
        menuCommands[i].gmId = registerModuleMenuCommand(item, enabled);
      }
    }
  }
}

// modules[tab.id] = moduleName
var modules = {};
chrome.tabs.onRemoved.addListener(function(tabId){
  if (tabId in modules)
    delete modules[tabId];
});

// routes[action] = handler
// handler - function(request, sender) {
//  ... code ...
//  return response;
// }
var routes = {
  initModule: function (request, sender, callback)
  {
    var response = {};
    var extEnable = GM_getValue('enable') == '1';
    var moduleName = request.moduleName;
    response.name = moduleName;

    if (sender.tab)
    {
      sender.tab.id = 1;
      response.moduleEnable = true;

      var info = chrome.app.getDetails();
      response.version = info.version;

      if(!request.frame)
      {
        modules[sender.tab.id] = moduleName;
      }

      response.helper = helper;
      response.lite = lite;
      response.downloads = false; //(window.GM_download !== undefined);
      response.moduleShowDownloadInfo = GM_getValue('moduleShowDownloadInfo') == '1';

      if(moduleName != 'savefrom')
      {
        response.ytHideFLV = GM_getValue('ytHideFLV');
        response.ytHideMP4 = GM_getValue('ytHideMP4');
        response.ytHideWebM = GM_getValue('ytHideWebM');
        response.ytHide3GP = GM_getValue('ytHide3GP');
        response.ytHide3D = GM_getValue('ytHide3D');
        response.ytHideMP4NoAudio = GM_getValue('ytHideMP4NoAudio');
        response.ytHideAudio_MP4 = GM_getValue('ytHideAudio_MP4');

        if (moduleName == 'lm')
        {
          response.moduleEnable &= GM_getValue('lmFileHosting') == '1'
            || GM_getValue('lmMediaHosting') == '1';

          response.lmMediaHosting = GM_getValue('lmMediaHosting');
          response.lmFileHosting = GM_getValue('lmFileHosting');
        }
        else
        {
          response.moduleEnable &= GM_getValue(pref_names[moduleName]) == '1';

          if(moduleName == 'vk')
          {
            response.vkShowBitrate = GM_getValue('vkShowBitrate');
          }
        }
      }

      if(!request.frame)
      {
        registerMenuCommands(request.moduleName, extEnable);

        if(response.moduleEnable || moduleName == 'savefrom')
        {
          _menu.setTitle(chrome.i18n.getMessage('extName'), info.version);
          _menu.create(extEnable);
        }
      }

      response.moduleEnable &= extEnable;
    }

    callback(response);
    userTrack();
  },


  hideDownloadInfo: function(request, sender){
    GM_setValue('moduleShowDownloadInfo', '0');
  },


  getVimeoLinks: function (request, sender, callback)
  {
    function callback_links(links, title, thumb)
    {
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links,
        title: title,
        thumb: thumb
      };

      callback(response);
    }

    getVimeoLinks(request.extVideoId, callback_links);
  },


  getVKLinks: function (request, sender, callback)
  {
    function callback_links(vid, links, title, duration, thumb, data, embed)
    {
      if(embed)
      {
        embed.origRequest = request;
        routes[embed.action](embed, sender, callback);
        return;
      }

      var response = {
        action: request.action,
        extVideoId: vid ? vid : request.extVideoId,
        links: links,
        title: title,
        duration: duration,
        thumb: thumb,
        data: data,
        checkLinks: null
      };

      if(request.checkLinks && links && links.length > 0)
      {
        checkVkLinks(links, function(checkUrl, isValid, status){
          response.checkLinks = isValid;
          callback(response);
        });
        return;
      }

      callback(response);
    }

    getVKLinks(request.extVideoId, callback_links);
  },


  getYoutubeLinks: function (request, sender, callback)
  {
    function callback_links(links, title, subtitles, duration)
    {
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links,
        title: title,
        subtitles: subtitles,
        duration: duration,
        checkLinks: null
      };

      if(request.checkLinks && links)
      {
        checkYoutubeLinks(links, function(checkUrl, isValid, status){
          response.checkLinks = isValid;
          callback(response);
        });
        return;
      }

      callback(response);
    }

    getYoutubeLinks(sender.tab.url, request.extVideoId, request.checkSubtitles, callback_links);
  },


  getOdnoklassnikiLinks: function (request, sender, callback)
  {
    function callback_links(links)
    {
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links,
        title: request.title
      };

      callback(response);
    }

    getOdnoklassnikiLinks(request.extVideoId, callback_links);
  },


  getOdnoklassnikiAudioLinks: function (request, sender, callback)
  {
    function callback_links(data)
    {
      var response = {
        action: request.action,
        trackId: request.trackId,
        jsessionId: request.jsessionId,
        data: data
      };

      callback(response);
    }

    getOdnoklassnikiAudioLinks(sender.tab.url, request.trackId, request.jsessionId, callback_links);
  },


  getDailymotionLinks: function (request, sender, callback)
  {
    function callback_links(data)
    {
      if (!data) {
        data = {};
      }
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: data.links,
        title: data.title,
        duration: data.duration,
        thumb: data.thumb
      };

      callback(response);
    }

    getDailymotionLinks(request.extVideoId, callback_links)
  },


  getSoundcloudTrackInfo: function (request, sender, callback)
  {
    function callback_links(data, isValid)
    {
      var response = {
        action: request.action,
        trackUrl: request.trackUrl,
        client_id: request.client_id,
        data: data,
        checkLinks: isValid
      };

      callback(response);
    }

    getSoundcloudTrackInfo(request.trackUrl, request.client_id, callback_links);
  },


  getFileSize: function (request, sender, callback)
  {
    getFileSize(request.url, callback);
  },


  downloadFile: function(request, sender, callback)
  {
    function callback_info(id)
    {
      var response = {
        options: request.options,
        id: id
      };

      callback(response);
    }

    downloadFile(request.options, callback_info);
  }
};


// content scripts dispatcher
chrome.extension.onRequest.addListener(function(request, sender, callback){
  //console.log('dispatcher', request, sender, callback);
  routes[request.action](request, sender, callback);
});


function getHelperName()
{
  var info = chrome.app.getDetails();
  if(info && info.name && info.name.search(/\s+lite/i) > -1)
    return 'chromelite';

  if(navigator && navigator.userAgent)
  {
    if(navigator.userAgent.search(/YaBrowser\/\d+\.\d+/i) > -1)
      return 'yabrowser';

    if(navigator.userAgent.search(/OPR\/\d+\.\d+/i) > -1)
      return 'opera-chromium';
  }

  return 'chrome';
}


// actions from menu
function enableExtension()
{
  // toggle extension status
  var enabled = GM_getValue('enable') == '1';
  enabled = !enabled;

  GM_setValue('enable', enabled ? '1' : '0');
  _menu.setEnabled(enabled);
  registerMenuCommands(modules[1], enabled);
  setButtonParams();
}


function downloadFromCurrentPage()
{
  chrome.tabs.getSelected(null, function(tab)
  {
    var url = 'http://savefrom.net/?url=' + encodeURIComponent(tab.url) +
      '&utm_source=' + helper + '&utm_medium=extensions&utm_campaign=bookmarklet';

    chrome.tabs.create({url: url, selected: true});
  });
}


function installFullVersion()
{
  var url = 'http://savefrom.net/user.php?helper=1' +
    '&utm_source=' + helper + '&utm_medium=extensions&utm_campaign=get_full_version';

  chrome.tabs.create({url: url, selected: true});
}


function showOptions()
{
  _options.show();
}


function reportBug()
{
  var url = 'http://savefrom.userecho.com/forum/20869-/';
  if(chrome.i18n.getMessage("lang") == 'ru')
    url = 'http://savefrom.userecho.com/forum/19523-/';

  chrome.tabs.create({url: url, selected: true});
}


// tab actions
/*
var tabActions = ['updateLinks', 'downloadPlaylist', 'downloadMP3Files', 'downloadPhotos'];

function tabAction(request, tab)
{
  if (tab)
  {
    chrome.tabs.sendRequest(tab.id, request);
  }
  else
  {
    chrome.tabs.getSelected(null, function(tab){
      chrome.tabs.sendRequest(tab.id, request);
    });
  }
}

function createAction(name, tab)
{
  return function(){
    tabAction({action: name}, tab);
  };
}

for (var i = 0; i < tabActions.length; i++)
{
  var actionName = tabActions[i];
  window[actionName] = createAction(actionName);
}
*/

// ---------

//setButtonParams();

if(GM_getValue('enable') != '0')
  checkVersion();

function setButtonParams()
{
  var icon = {path: 'images/icon_18.png'};
  var title = {title: chrome.i18n.getMessage("titleDefault")};

  if(GM_getValue('enable') == '0')
  {
    title.title = chrome.i18n.getMessage("titleDesabled");
    icon.path = 'images/icon_disabled_18.png';
  }

  chrome.browserAction.setIcon(icon);
  chrome.browserAction.setTitle(title);
}


function fixPref(pref)
{
  for(i = 0; i < pref.length; i++)
  {
    if(GM_getValue(pref[i].name) != pref[i].check)
      GM_setValue(pref[i].name, pref[i].def);
  }
}


function checkVersion()
{
  var url = '',
      info = chrome.app.getDetails();

  if(!GM_getValue('version') || GM_getValue('version') == '0')
  {
    // first run
    url = 'http://savefrom.net/user.php?helper=userjs;firstrun';
  }
  else if(GM_getValue('version') != info.version)
  {
    // update
    //url = 'http://savefrom.net/user.php?helper=userjs;update';
  }

  if(url)
  {
    GM_setValue('version', info.version);
    return;

    if(!infoPageActive)
    {
      chrome.tabs.create({url: url, selected: false, active: false});
    }
    else
    {
      chrome.tabs.query({url: '*://legal.yandex.com.tr/*'}, function(tabs) {
        var active = tabs.length == 0;
        chrome.tabs.query({url: '*://legal.yandex.ru/*'}, function(tabs) {
          active = active && tabs.length == 0;
          chrome.tabs.create({url: url, selected: active, active: active});
        });
      });
    }
  }
}


function sendRequest(url, callback, method, referer, post, cookie, header)
{
  method = method ? method : ((post) ? 'POST' : 'GET');

  var headers = {};

  if(referer)
    headers['Referer'] = referer;

  if(cookie)
    headers['Cookie'] = cookie;

  if(post)
  {
    headers['Content-type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = post.length;
  }

  if(header)
  {
    for(var i = 0; i < header.length; i++)
    {
      headers[header[i][0]] = header[i][1];
    }
  }

  function cb(r)
  {
    r.getResponseHeader = function(header){
      if(!r.responseHeaders)
        return '';

      var re = new RegExp("(?:^|[\\r\\n])" + header + ":\\s*(.+)(?:[\\r\\n]|$)", "im");
      var m = r.responseHeaders.match(re);
      if(m && m.length > 1)
        return m[1];

      return '';
    }

    callback(r);
  }

  GM_xmlhttpRequest({
    method: method,
    url: url,
    data: post ? post : '',
    headers: headers,
    onload: cb,
    onerror: cb,
    ontimeout: cb
  });
}


function getFileSize(url, callback, referer, cookie, header)
{
  sendRequest(url, function(req){
    var response = {
      fileSize: 0,
      fileType: '',
      status: req.status
    };

    if (req.status == 200 || req.status == 206)
    {
      var s = req.getResponseHeader('Content-Length');
      if(s)
      {
        s = parseInt(s);
        if(!isNaN(s))
          response.fileSize = s;
      }

      var t = req.getResponseHeader('Content-Type');
      if(t)
        response.fileType = t;
    }

    callback(response);

  }, 'HEAD', referer, null, cookie, header);
}


function downloadFile(options, callback)
{
  if(chrome.downloads)
    return chrome.downloads.download(options, callback);

  callback();
}


function getVimeoLinks(videoId, callback)
{
  getVimeoNoEmbedLinks(videoId, function(links, title, thumb){
    if(links)
    {
      callback(links, title, thumb);
      return;
    }

    getVimeoEmbedLinks(videoId, callback);
  });
}


function getVimeoEmbedLinks(videoId, callback)
{
  sendRequest('http://player.vimeo.com/video/' + videoId, function(r){
    if(r.status == 200 && r.responseText)
    {
      var config = r.responseText.match(/,c\s*=\s*(\{[\s\S]+?\})\s*;/i);
      if(config && config.length > 1)
      {
        config = config[1];

        var data = getVimeoDataFromConfig(config);
        if(data && data.links)
        {
          callback(data.links, data.title, data.thumb);
          return;
        }
      }
    }

    callback(null, '', '');
  });
}


function getVimeoNoEmbedLinks(videoId, callback)
{
  sendRequest('http://vimeo.com/' + videoId, function(r){
    if(r.status == 200 && r.responseText)
    {
      var configUrl = r.responseText.match(
        /data-config-url=[\"']([^\s\"'\<\>]+)/i);

      if(configUrl && configUrl.length > 1)
      {
        configUrl = configUrl[1].replace(/&amp;/ig, '&');
        sendRequest(configUrl, function(r){
          if(r.status == 200 && r.responseText)
          {
            var data = getVimeoDataFromConfig(r.responseText);
            if(data && data.links)
            {
              callback(data.links, data.title, data.thumb);
              return;
            }
          }

          callback(null, '', '');
        });

        return;
      }
    }

    callback(null, '', '');
  });
}


function getVimeoDataFromConfig(config)
{
  config = config.replace(/(\{|,)\s*(\w+)\s*:/ig, '$1"$2":').
    replace(/(:\s+)\'/g, '$1"').replace(/\'([,\]\}])/g, '"$1');

  try
  {
    config = JSON.parse(config);
  }
  catch(err)
  {
    return null;
  }

  if(!config || !config.request || !config.video ||
    !config.request.files || !config.request.files.codecs.length)
  {
    return null;
  }

  var r = config.request, v = config.video, data = {};

  data.title = v.title ? v.title : '';

  if(v.thumbs)
  {
    for(i in v.thumbs)
    {
      data.thumb = v.thumbs[i];
      break;
    }
  }

  data.links = [];

  var codecs = r.files.codecs;
  for(var k = 0; k < codecs.length; k++)
  {
    var files = r.files[codecs[k]];
    if(files)
    {
      for(var i in files)
      {
        var name = i.length <= 3 ? i.toUpperCase() :
          ucfirst(i.toLowerCase());

        var ext = files[i].url.match(/\.(\w{2,4})(?:\?|#|$)/i);
        if(ext && ext.length > 1)
          ext = ext[1].toLowerCase();
        else
          ext = 'mp4';

        data.links.push({
          url: files[i].url,
          name: name,
          type: ext,
          ext: ext.toUpperCase()
        });
      }
    }
  }

  return data;
}


function getVkFlvLink(v)
{
  if(v.host.search(/^https?:\/\//i) != -1)
  {
    if(v.host.charAt(v.host.length - 1) != '/')
      v.host += '/';

    if(v.host.search(/^https?:\/\/cs\d+\./i) != -1)
      return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.flv';

    return v.host + 'assets/video/' + v.vtag + v.vkid + '.vk.flv';
  }

  if(v.host.search(/\D/) == -1)
    return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.flv';

  return 'http://' + v.host + '/assets/video/' + v.vtag + v.vkid + '.vk.flv';
}


function getVkMp4Link(v, q)
{
  if(q == 240 && v.no_flv == 0)
    return getVkFlvLink(v);

  if(v.host.search(/^https?:\/\//i) != -1)
  {
    if(v.host.charAt(v.host.length - 1) != '/')
      v.host += '/';

    return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
  }

  return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
}


function getVkVideoLinks(v)
{
  if(!v || !v.host || !v.vtag || (!v.vkid && !v.uid))
    return null;

  if(typeof(v.host) != 'string' && v.host.toString)
    v.host = v.host.toString();

  v.host = v.host.replace(/\\\//g, '/');

  if(v.hd > 0 && (!v.hd_def || v.hd > v.hd_def))
    v.hd_def = v.hd;

  var links = [];
  if(v.hd_def <= 0 && v.no_flv == 0)
  {
    links.push({
      url: getVkFlvLink(v),
      name: 'FLV',
      subname: '',
      type: 'flv'
    });
  }
  else
  {
    links.push({
      url: getVkMp4Link(v, 240),
      name: (v.no_flv == 0) ? 'FLV' : 'MP4',
      subname: '',
      type: (v.no_flv == 0) ? 'flv' : 'mp4'
    });

    if(v.hd_def > 0)
    {
      links.push({
        url: getVkMp4Link(v, 360),
        name: 'MP4',
        subname: '360',
        type: 'mp4'
      });

      if(v.hd_def > 1)
      {
        links.push({
          url: getVkMp4Link(v, 480),
          name: 'MP4',
          subname: '480',
          type: 'mp4'
        });

        if(v.hd_def > 2)
        {
          links.push({
            url: getVkMp4Link(v, 720),
            name: 'MP4',
            subname: '720',
            type: 'mp4'
          });
        }
      }
    }
  }

  return links;
}


function getVKLinks(videoId, callback)
{
  var links = [], title = videoId, duration = '', thumb = '', data = null, embed = null;

  var vid = videoId;
  if(vid.search(/^video-?\d+_\d+/i) == -1)
  {
    var oid = '', id = '';
    var m = vid.match(/(?:^|&)oid=(-?\d+)/i);
    if(m && m.length > 1)
      oid = m[1];

    m = vid.match(/(?:^|&)id=(-?\d+)/i);
    if(m && m.length > 1)
      id = m[1];

    vid = '';
    if(oid && id)
      vid = 'video' + oid + '_' + id;
  }

  if(!vid)
  {
    callback(vid, links, title);
    return;
  }

  title = vid;

  var url = 'http://vk.com/' + vid;

  sendRequest(url, function(r){
    try
    {
      if(r.status == 200 && r.responseText)
      {
        var json = r.responseText
                    .replace(/\{[a-zA-Z_\-\.]+\}/ig, '')
                    .match(/var vars\s*=\s*(\{[^\}]+\})/i);
        if(json)
        {
          try
          {
            json = json[1];

            if(json.search(/^\{\s*\\\"/) > -1)
              json = json.replace(/\\\"/g, '"');

            json = JSON.parse(json);
            if(json)
            {
              data = json;
              links = getVkVideoLinks(json);

              if(json.md_title)
                title = json.md_title;

              if(json.thumb)
                thumb = json.thumb;
              else if(json.jpg)
                thumb = json.jpg;

              if(thumb && thumb.search(/\\\//) > -1)
                thumb = thumb.replace(/\\\//g, '/');
            }
          }
          catch(err){}
        }
        else
        {
          var frame = r.responseText.match(/<iframe[^>]+>/ig), m;
          if(frame)
          {
            for(var i=0, l=frame.length; i<l; i++)
            {
              if(m = frame[i].match(/youtube.com\\?\/embed\\?\/([\w\-]+)/i))
              {
                embed = {
                  action: 'getYoutubeLinks',
                  extVideoId: m[1]
                };
                break;
              }
              if(m = frame[i].match(/vimeo.com\\?\/video\\?\/(\d+)/i))
              {
                embed = {
                  action: 'getVimeoLinks',
                  extVideoId: m[1]
                };
                break;
              }
            }
          }
          if (embed === null) {
            var ajaxPreload = r.responseText.lastIndexOf('ajax.preload');
            if (ajaxPreload !== -1) {
              var data = r.responseText.substr(ajaxPreload);
              var dmId = data.match(/url: '(?:[\w\\/]+.)?dailymotion.com(?:\\\/swf)?\\\/video\\\/([\w\d]+)\??/);
              if (dmId) {
                embed = {
                  action: 'getDailymotionLinks',
                  extVideoId: dmId[1]
                }
              }
            }
          }
        }

        var dur = r.responseText.match(/(['"]?)duration\1\s*:\s*(\d+)/i);
        if(dur)
        {
          duration = dur[2];
        }
      }
    }
    finally
    {
      callback(vid, links, title, duration, thumb, data, embed);
    }
  });
}


function checkVkLinks(links, callback)
{
  var checkUrl = '';

  if(links && links.length > 0)
  {
    if(links[0].type == 'mp4')
      checkUrl = links[0].url;
    else if(links.length > 1)
      checkUrl = links[1].url;
    else
      checkUrl = links[0].url;
  }

  if(checkUrl)
  {
    getFileSize(checkUrl, function(r){
      var isValid = (r.status >= 400) ? false : true;
      callback(checkUrl, isValid, r.status);
    });
    return;
  }

  callback();
}


function getYoutubeLinks(eurl, videoId, checkSubtitles, callback_) {
  var links = null, title = '', duration = '';
  eurl = encodeURIComponent(eurl);
  var url = 'http://www.youtube.com/get_video_info?video_id=' + videoId +
    '&asv=3&eurl=' + eurl + '&el=info&sts=15956';

  var cookies = 'VISITOR_INFO1_LIVE=; PREF=; GEO=; use_hitbox=';

  var embed = true;
  var callback = function(links, title, subtitles, duration) {
      if(links || !embed)
      {
          callback_(links, title, subtitles, duration);
      }
      else
      {
        embed = false;
        url = 'http://www.youtube.com/watch?v=' + videoId;
        sendRequest(url, getYoutubeLinks_, '', url, '', cookies);
      }
  };

  sendRequest(url, getYoutubeLinks_, '', url, '', cookies);

  function getYoutubeLinks_(r) {
    var cb = function() {
      if(checkSubtitles)
      {
        checkYoutubeSubtitles(videoId, function(subtitles){
          callback(links, title, subtitles, duration);
        });
      }
      else
        callback(links, title, null, duration);
    };

    if (r.status !== 200 || !r.responseText) {
      return cb();
    }

    var dashUrl;
    try {
      var getParam = function(str, param, number) {
        var re = new RegExp('(?:^|&)' + param + '=([^\\s\\&\\"]+)', 'i');
        if(!embed)
        {
          re = new RegExp('\\"' + param + '\\"\\s*:\\s*\\"([^\\"]+)\\"', 'i');
          if(number)
            re = new RegExp('\\"' + param + '\\"\\s*:\\s*\\"?(\\d+)', 'i');
        }

        var m = str.match(re);
        if(m && m.length > 1)
        {
          if(embed)
            return decodeURIComponent(m[1]);

          var json = '{"v": "' + m[1] + '"}';
          var obj = JSON.parse(json);
          if(obj && obj.v)
            return obj.v;
        }

        return '';
      };
      var baseUrl = '',
        adaptiveFmts = getParam(r.responseText, 'adaptive_fmts'),
        title = getParam(r.responseText, 'title'),
        length_seconds = getParam(r.responseText, 'length_seconds', true),
        fmtMap = getParam(r.responseText, '(?:fmt_url_map|url_encoded_fmt_stream_map)');

      dashUrl = getParam(r.responseText, 'dashmpd');

      if(!embed)
        fmtMap = fmtMap.split('\\u0026').join('&');

      if(fmtMap.search(/url%3dhttp/i) > -1)
        fmtMap = decodeURIComponent(fmtMap);

      var titleParam = '';
      if(title)
      {
        title = title.replace(/\+/g, '%20');
        title = decodeURIComponent(title).
          replace(/[\x2F\x5C\x3A\x7C]/g, '-').
          replace(/[\x2A\x3F]/g, '').
          replace(/\x22/g, '\'').
          replace(/\x3C/g, '(').
          replace(/\x3E/g, ')').
          replace(/(?:^\s+)|(?:\s+$)/g, '');

        titleParam = '&title=' + encodeURIComponent(title);
      }

      if(length_seconds)
        duration = length_seconds;

      var lks = parseYoutubeFmtMap(fmtMap, titleParam, baseUrl);
      if(adaptiveFmts)
      {
        var adaptive_links = parseYoutubeFmtMap(adaptiveFmts, titleParam, baseUrl);

        for (var i in adaptive_links) {
          if(!lks[i])
            lks[i] = adaptive_links[i];
        }
      }

      // Deprecated
      // findYoutubeAvailableLinks(lks, baseUrl, dashUrl, adaptiveFmts, titleParam);

      if(lks)
        links = lks;
    }
    finally {
      getYouTubeDashLinks(links, dashUrl, function(_links) {
        if (_links) {
          links = _links;
        }
        cb();
      });
    }
  }
}

var getYouTubeDashLinks = (function() {
  var parseDash = function(xml, links, cb) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xml,"text/xml");
    var elList = xmlDoc.querySelectorAll('Representation');
    if (!links) {
      links = {};
    }
    for (var i = 0, el; el = elList[i]; i++) {
      var itag = el.id;
      if (links[itag] !== undefined) {
        continue;
      }
      var baseurl = el.querySelector('BaseURL');
      if (baseurl === null) {
        continue;
      }
      var url = baseurl.textContent;
      links[itag] = url;
    }
    cb(links);
  };
  var _getDashLinks = function(links, dashmpd, cb) {
    if (!dashmpd) {
      return cb();
    }
    var signature_pos = dashmpd.indexOf('signature');
    if (signature_pos === -1) {
      var s_pos = dashmpd.indexOf('/s/');
      if (s_pos === -1) {
        return cb();
      }
      s_pos += 3;
      var s_end = dashmpd.indexOf('/', s_pos);
      if (s_end === -1) {
        s_end = dashmpd.length;
      }
      var s = dashmpd.substr( s_pos, s_end - s_pos );
      var signature = youtubeSignatureDecipher(s);
      if (signature === s) {
        return cb();
      }
      dashmpd = dashmpd.substr(0, s_pos - 2) + 'signature/' + signature + dashmpd.substr(s_end);
    }
    sendRequest(dashmpd, function(r) {
      if(r.status !== 200) {
        return cb();
      }
      parseDash(r.responseText, links, cb);
    });
  };
  return _getDashLinks;
})();

function youtubeSignatureDecipher(sig)
{
  function swap(a, b)
  {
    var t = a[0];
    a[0] = a[b % a.length];
    a[b] = t;
  }

  var s = sig.split('');
  swap(s, 43);
  swap(s, 2);
  swap(s, 54);
  s = s.reverse();
  swap(s, 8);
  s = s.slice(1);
  return s.join('');
}


function checkYoutubeLinks(links, callback)
{
  var checkUrl = '';

  var checkItags = ['18', '34', '35'], checkUrl = '';
  for(var i = 0; i < checkItags.length; i++)
  {
    if(links[checkItags[i]])
    {
      checkUrl = links[checkItags[i]];
      break;
    }
  }

  if(checkUrl)
  {
    getFileSize(checkUrl, function(r){
      var isValid = (r.status >= 400) ? false : true;
      callback(checkUrl, isValid, r.status);
    });
    return;
  }

  callback();
}


function findYoutubeAvailableLinks(links, baseUrl, dashUrl, adaptiveFmts, titleParam)
{
  if(!baseUrl || !dashUrl || !adaptiveFmts)
    return;

  var dashQuery = getYoutubeDashQuery(dashUrl);
  if(!dashQuery)
    return;

  var itags = getYoutubeAdaptiveFtmItags(adaptiveFmts);
  if(!itags)
    return;

  var map = {
    '133': ['5'], // 240
    '134': ['34', '18', '43'], // 360
    '135': ['35', '44'], // 480
    '136': ['22', '45'], // 720
    '137': ['37', '46'], // 1080
    '138': ['38'] // 4k
  };

  for(var i = 0; i < itags.length; i++)
  {
    if(map[itags[i]])
    {
      for(var j = 0; j < map[itags[i]].length; j++)
      {
        var itag = map[itags[i]][j];
        if(!links[itag])
        {
          links[itag] = baseUrl + dashQuery + '&itag=' + itag + titleParam;
        }
      }
    }
  }
}

function parseYoutubeFmtMap(fmtMap, titleParam, baseUrl)
{
  if(!fmtMap)
    return;

  var l = {};

  fmtMap = fmtMap.split(',');
  for(var i = 0; i < fmtMap.length; ++i)
  {
    var query = parseQuery(fmtMap[i]);
    if(query.url)
    {
      query.url = decodeURIComponent(query.url);
      if(query.url.search(/(\?|&)sig(nature)?=/i) == -1)
      {
        if(query.sig)
          query.url += '&signature=' + query.sig;
        else if(query.signature)
          query.url += '&signature=' + query.signature;
        else if(query.s)
          query.url += '&signature=' + youtubeSignatureDecipher(query.s);
      }

      if(query.url.search(/(\?|&)itag=/i) == -1)
      {
        if(query.itag)
          query.url += '&itag=' + query.itag;
      }

      var fmt = query.url.match(/(?:\?|&)itag=(\d+)/i);
      if(fmt && fmt.length > 1)
      {
        fmt = fmt[1];

        query.url = query.url.replace(/(\?|&)sig=/i, '$1signature=').
          replace(/\\u0026/ig, '&').replace(/\\\//g, '/');

        l[fmt] = query.url;

        if(titleParam)
          l[fmt] += titleParam;

        if(!baseUrl)
        {
          var m = query.url.match(/^(https?:\/\/[^\?]+\?)/);
          if(m && m.length > 1)
            baseUrl = m[1];
        }
      }
    }
  }

  return l;
}

function getYoutubeDashQuery(dashUrl)
{
  if(!dashUrl)
    return '';

  var u = dashUrl.replace(/^.+\/api\/manifest\/dash\//i, '');
  if(u == dashUrl)
    return '';

  u = u.split('/');
  if(!u || u.length < 2)
    return '';

  var query = {};
  for(var i = 0; i < u.length - 1; i += 2)
  {
    if(u[i] != 'itag')
    {
      u[i] = decodeURIComponent(u[i]);
      u[i + 1] = decodeURIComponent(u[i + 1]);

      if(u[i] == 's')
      {
        u[i] = 'signature';
        u[i + 1] = youtubeSignatureDecipher(u[i + 1]);
      }
      else if(u[i] == 'sig')
      {
        u[i] = 'signature';
      }
      else if(u[i] == 'sparams' && u[i + 1].search(/(^|,|%2C)itag(^|,|%2C)/i))
      {
        return '';
      }

      query[u[i]] = u[i + 1];
    }
  }

  if(!query.signature)
    return '';

  query.ratebypass = 'yes';
  return getQueryString(query);
}


function getYoutubeAdaptiveFtmItags(adaptiveFmts)
{
  if(!adaptiveFmts)
    return;

  var itags = [];

  adaptiveFmts = adaptiveFmts.split('\\u0026').join('&');
  u = adaptiveFmts.split(',');
  for(var i = 0; i < u.length; ++i)
  {
    var q = parseQuery(u[i]);
    var itag = 0;

    if(q.url)
    {
      q.url = decodeURIComponent(q.url);
      var m = q.url.match(/(?:\?|&)itag=(\d+)/i);
      if(m && m.length > 1)
        itag = m[1];
    }

    if(!itag && q.itag)
      itag = q.itag;

    if(itag)
      itags.push(itag);
  }

  return itags;
}


function checkYoutubeSubtitles(videoId, callback)
{
  var url = 'http://video.google.com/timedtext?hl=en&v=' + videoId +
    '&type=list&tlangs=1';

  sendRequest(url, function(r){
    var result = false;
    if(r.status == 200 && r.responseXML)
    {
      var doc = r.responseXML;
      if(doc.getElementsByTagName &&
       (doc.getElementsByTagName('TARGET').length || doc.getElementsByTagName('TRACK').length))
      {
        result = true;
      }
    }

    callback(result);
  });
}


function getOdnoklassnikiLinks(extVideoId, callback)
{
  if(!extVideoId)
  {
    callback(null);
    return;
  }

  var url = 'http://in.video.mail.ru/cgi-bin/video/oklite?eid=' + extVideoId;

  sendRequest(url, function(r){
    if(r.status == 200 && r.responseText)
    {
      var u = 'http://www.okcontent.video.mail.ru/media/';

      var host = r.responseText.match(/\$vcontentHost=([^\s\"'\<\>]+)/i);
      if(host && host.length > 1)
        u = 'http://' + host[1] + '/media/';

      u += extVideoId;

      var links = [];
      links.push({
        url: u + '-v.mp4',
        name: 'SD',
        ext: 'FLV'
      });

      if(r.responseText.search(/\$HDexist=1/i) > -1)
      {
        links.push({
          url: u + '-hv.mp4',
          name: 'HD',
          ext: 'MP4'
        });
      }

      if(links)
      {
        callback(links);
        return;
      }
    }

    callback(null);
  }, '', url);
}


function getOdnoklassnikiAudioLinks(pageUrl, trackId, jsessionId, callback)
{
  if(!trackId || !jsessionId)
  {
    callback(null);
    return;
  }

  var url = 'http://wmf1.odnoklassniki.ru/play;jsessionid=' + jsessionId +
    '?tid=' + trackId + '&';

  sendRequest(url, function(r){
    var data = null;
    if(r.status == 200 && r.responseText)
    {
      data = JSON.parse(r.responseText);
    }

    callback(data);
  }, '', url);
}


function getSoundcloudTrackInfo(trackUrl, client_id, callback)
{
  if(!trackUrl || !client_id)
  {
    callback(null);
    return;
  }

  var url = 'http://api.soundcloud.com/resolve.json?url=' + trackUrl +
    '&client_id=' + client_id;

  sendRequest(url, function(r){
    var data = null;

    if(r.status < 400 && r.responseText)
    {
      var data = JSON.parse(r.responseText);
      if(!data)
        data = r.responseText;
    }
    checkSoundcloudLinks(data, client_id, callback);
  }, '', url);
}

function checkSoundcloudLinks(data, client_id, cb) {
  if (!data) {
    return cb();
  }
  var info = data;

  if(info.kind !== 'track' && info.tracks && info.tracks.length === 1)
    info = info.tracks[0];

  if(info.kind === 'track' && info.stream_url) {
    validateSoundcloudTrackUrl(info.stream_url, client_id, function (isValid) {
      cb(data, isValid);
    });
    return;
  }

  if (info.tracks) {
    validateSoundcloudTrackUrl(info.tracks[0].stream_url, client_id, function(isValid) {
      cb(data, isValid);
    });
    return;
  }

  return cb(data);
}

function validateSoundcloudTrackUrl(url, client_id, cb) {
  url += (url.indexOf('?') === -1) ? '?' : '&';
  url += 'client_id=' + client_id;
  sendRequest(url, function(r) {
    cb(r.status === 200);
  }, 'HEAD');
}


var getDailymotionLinks = (function() {
  var readLink = function(url) {
    url = url.replace(/\\\//g, '/');
    url = url.replace(/\@\@[\w\-]+$/, '');
    var size = '';
    var t = url.match(/\/cdn\/\w+\-(\d+x\d+)\//i);
    if(t && t.length > 1)
    {
      size = t[1];
    }
    else
    {
      t = url.match(/\D(\d+x\d+)\D/i);
      if(t && t.length > 1)
      {
        size = t[1];
      }
    }

    var ext = 'FLV';
    t = url.match(/\.(\w{1,6})(?:$|\?)/);
    if(t && t.length > 1)
    {
      ext = t[1].toUpperCase();
    }

    if(size !== '80x60')
    {
      var height = parseInt(size.split('x').slice(-1)[0]);
      return {url: url, name: ext+' '+height, ext: ext, info_url: '', height: height};
    }
  };

  var getLinks = function(text, cb)
  {
    var about = {};
    var links = [];
    var info = text.match(/(?:var|,)\s*info\s*=\s*\{(.*?)\}\s*(?:;|,\s*\w+\s*=)/i);

    if(!info || info.length < 2) {
      return cb();
    }
    info = info[1];
    try {
      info = JSON.parse('{' + info + '}');
      if(!info) {
        return cb();
      }
      about.title = info.title;
      about.duration = info.duration;
      about.thumb = info.thumbnail_medium_url;
      for(var i in info)
      {
        if (!info.hasOwnProperty(i)) {
          continue;
        }
        if (!info[i]) {
          continue;
        }
        if(info[i].search(/^https?:\/\/[^\s\"]+\.(mp4|flv)(\?|$)/) > -1)
        {
          var link = readLink(info[i]);
          if (link !== undefined) {
            links.push(link);
          }
        }
      }
    } catch(e){}
    if (links.length > 0) {
      about.links = links;
    }
    cb(about);
  };

  var getEmbedVideoInfo = function (id, callback) {
    var url = "http://www.dailymotion.com/embed/video/" + id;
    sendRequest(url, function(r) {
      if(r.status !== 200) {
        return callback();
      }
      getLinks(r.responseText, callback);
    });
  };
  return getEmbedVideoInfo;
})();


function parseQuery(query)
{
  var k = {};
  var re = /[?&]?([^=]+)(?:=([^&]*))?/g;
  while(m = re.exec(query))
  {
    if(m[1] && m[2])
      k[m[1]] = m[2];
    else if(m[1])
      k[m[1]] = '';
  };

  return k;
}


function getQueryString(query, key_prefix, key_suffix)
{
  if(!query || typeof(query) != 'object')
    return '';

  if(key_prefix === undefined)
    key_prefix = '';

  if(key_suffix === undefined)
    key_suffix = '';

  var str = '';
  for(key in query)
  {
    if(str.length)
      str += '&';

    if(query[key] instanceof Object)
    {
      if(!key_prefix)
        key_prefix = '';

      if(!key_suffix)
        key_suffix = '';

      str += getQueryString(query[key], key_prefix + key + "[", "]" + key_suffix);
    }
    else
      str += key_prefix + escape(key) + key_suffix + '=' + escape(query[key]);
  }

  return str;
}


function ucfirst(str)
{
  if(str.length)
    str = str.charAt(0).toUpperCase() + str.slice(1);

  return str;
}

function userTrack() {
  var now = Date.now();
  if (GM_getValue('trackTime') > now) {
    return;
  }

  GM_setValue('trackTime', now + 86400000);
  dblCheck(function() {
    sendScreenViewStats('init');
  });
}

function dblCheck(cb) {
  var dblTrack = GM_getValue('dblTrack');
  var dataList = (dblTrack)?dblTrack.split(','):'';
  var now = Date.now();
  if (dataList && dataList[1] > now) {
    return;
  }
  var uuid = generateUuid();
  var expire = now + 60000;
  GM_setValue('dblTrack', uuid+','+expire);
  setTimeout(function() {
    var dblTrack = GM_getValue('dblTrack');
    var dataList = (dblTrack)?dblTrack.split(','):'';
    if (dataList[0] !== uuid) {
      return;
    }
    cb();
  }, 5000);
}

function sendScreenViewStats(screenName) {
  var params = {
    an: 'helper',
    aid: 'userjs-' + helper,
    av: chrome.app.getDetails().version,
    t: 'screenview',
    cd: screenName
  };

  sendStatsInfo(params);
}

function sendStatsInfo(params) {
  if(!params.t)
    return;

  var def = {
    v: 1,
    tid: 'UA-7055055-5',
    cid: getUuid(),
    //ul: chrome.i18n.getMessage("lang")
  };

  for (var i in def) {
    if(!params[i])
      params[i] = def[i];
  }

  sendRequest('https://www.google-analytics.com/collect',
    function(r){}, 'POST', '',
    getQueryString(params)
  );
}

function getUuid() {
  var uuid = GM_getValue('uuid');
  if (uuid) {
    return uuid;
  }
  uuid = generateUuid();
  GM_setValue('uuid', uuid);
  return uuid;
}

function generateUuid()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}


fixPref([
  {name: 'button', check: '0', def: '1'},
  {name: 'moduleVimeo', check: '0', def: '1'},
  {name: 'moduleFacebook', check: '0', def: '1'},
  {name: 'moduleSoundcloud', check: '0', def: '1'},
  {name: 'ytHideFLV', check: '1', def: '0'},
  {name: 'ytHideMP4', check: '1', def: '0'},
  {name: 'ytHideWebM', check: '0', def: '1'},
  {name: 'ytHide3GP', check: '0', def: '1'},
  {name: 'ytHide3D', check: '0', def: '1'},
  {name: 'ytHideMP4NoAudio', check: '0', def: '1'},
  {name: 'ytHideAudio_MP4', check: '0', def: '1'},
  {name: 'vkShowBitrate', check: '1', def: '0'}
]);

};

/////////////////////////////////////////////////
// UTILS

SaveFrom_Utils = {
  downloadParam: 'sfh--download',
  prefs: {},

  initModule: function(name, callback)
  {
    var request = {
      action: 'initModule',
      moduleName: name,
      frame: (window.top != window.self)
    };

    callback = callback || function(){};
    chrome.extension.sendRequest(request, callback);
  },


  runModule: function(response, module)
  {
    if (!response)
      return;

    this.prefs = response;

    //console.log('moduleEnable', response.moduleEnable, module)

    if(response.name == 'savefrom')
      module.run();

    else if (response.moduleEnable)
      module.run();
  },


  trim: function(str)
  {
    return str.replace(/^\s+|\s+$/g, '');
  },


  nextSibling: function(obj)
  {
    var next = obj;
    do
    {
      next = next.nextSibling;
      if(next)
      {
        if(next.nodeType == 1)
          return next;

        if(next.nodeType == 9)
          break;
      }
    }
    while(next);

    return null;
  },


  setStyle: function(node, style)
  {
    if(!node || !style)
      return;

    for(var i in style)
      node.style[i] = style[i];
  },


  getStyle: function(node, property)
  {
    var s = undefined;
    if(!node)
      return undefined;

    if(node.currentStyle)
    {
      property = property.replace(/-(w)/g, function(s, m){return m.toUpperCase()});
      return node.currentStyle[property];
    }

    if(window.getComputedStyle)
      return window.getComputedStyle(node, null).getPropertyValue(property);

    return undefined;
  },

  addStyleRules: function(selector, rules)
  {
    var style = document.getElementById('savefrom-styles');
    if(!style)
    {
      style = document.createElement('style')
      style.id = 'savefrom-styles';
      // maybe need for safari
      //style.appendChild(document.createTextNode(""));
      var s = document.querySelector('head style');
      if(s)
        // allow to override our styles
        s.parentNode.insertBefore(style, s);
      else
        document.querySelector('head').appendChild(style);
    }

    if(typeof(rules) == 'object') {
      var r = [];
      for(var i in rules)
        r.push(i + ':' + rules[i]);

      rules = r.join(';');
    }

    style.sheet.addRule(selector, rules);
  },

  getPosition: function(node)
  {
    var box = node.getBoundingClientRect();

    return {
        top: Math.round(box.top + window.pageYOffset),
        left: Math.round(box.left + window.pageXOffset)
    }
  },

  getSize: function(node)
  {
    return {width: node.offsetWidth, height: node.offsetHeight};
  },

  getMatchFirst: function(str, re)
  {
    var m = str.match(re);
    if(m && m.length > 1)
      return m[1];

    return '';
  },


  getElementByIds: function(ids)
  {
    for(var i = 0; i < ids.length; i++)
    {
      var node = document.getElementById(ids[i]);
      if(node)
        return node;
    }

    return null;
  },


  hasClass: function(node, name)
  {
    if(!node || !node.className || name == '')
      return false;

    if(node.className == name)
      return true;

    var re = new RegExp("(^|\\s+)" + name + "(\\s+|$)");
    if(node.className.search(re) != -1)
      return true;

    return false;
  },


  addClass: function(node, name)
  {
    if(!this.hasClass(node, name))
    {
      var c = node.className;
      if(c)
        node.className = c + ' ' + name;
      else
        node.className = name;
    }
  },


  removeClass: function(node, name)
  {
    if(!this.hasClass(node, name))
      return;

    var re = new RegExp("(^|\\s+)" + name + "(\\s+|$)");
    node.className = node.className.replace(re, function(t, s1, s2){
      if(s1 && s2)
        return ' ';

      return '';
    });
  },


  matchesSelector: function(node, selector)
  {
    if(node.matchesSelector)
      return node.matchesSelector(selector);

    if(node.webkitMatchesSelector)
      return node.webkitMatchesSelector(selector);

    var nodes = node.parentNode.querySelectorAll(selector);
    for(var i = 0; i < nodes.length; ++i)
    {
      if(nodes[i] == node)
        return true;
    }

    return false;
  },


  getParentByClass: function(node, name)
  {
    if(!node || name == '')
      return false;

    if(typeof(name) == 'object' && name.length > 0)
    {
      for(var parent = node; parent; parent = parent.parentNode)
      {
        for(var i = 0; i < name.length; i++)
        {
          if(this.hasClass(parent, name[i]))
            return parent;
        }
      }
    }
    else
    {
      for(var parent = node; parent; parent = parent.parentNode)
      {
        if(this.hasClass(parent, name))
          return parent;
      }
    }

    return null;
  },


  isParent: function(node, testParent)
  {
    for(var parent = node; parent; parent = parent.parentNode)
    {
      if (parent == testParent)
        return true;
    }

    return false;
  },


  emptyNode: function(node)
  {
    while(node.firstChild)
      node.removeChild(node.firstChild);
  },


  download: function(filename, url, options, callback, iframe)
  {
    if(!url)
      return false;

    filename = filename || this.getFileName(url);
    if(!filename)
      return false;

    if (!this.prefs || !this.prefs.downloads) {
      if (iframe && this.downloadCheckProtocol(url)) {
        var src = this.getMatchFirst(url, /(^https?:\/\/[^\/]+)/);

        if(src == location.protocol + '//' + location.host) {
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          this.click(a);
          setTimeout(function(){
            a.parentNode.removeChild(a);
          }, 100);
        }
        else {
          var params = {url: url, filename: filename};
          params = encodeURIComponent(JSON.stringify(params));

          src += '/404?#' + this.downloadParam + '=' + params;

          var f = document.createElement('iframe');
          f.src = src;
          this.setStyle(f, {
            width: 0,
            height: 0,
            overflow: 'hidden'
          });

          document.body.appendChild(f);

          setTimeout(function(){
            f.parentNode.removeChild(f);
          }, 3000);
        }

        return true;
      }

      return false;
    }

    var params = options || {};
    params.url = url;
    params.filename = filename;

    var request = {
      action: 'downloadFile',
      options: params
    };

    callback = callback || function(){};

    chrome.extension.sendRequest(request, callback);
    return true;
  },


  downloadCheckProtocol: function(url) {
    if(location.protocol == 'http:') {
      return true;
    }

    if(!url) {
      return false;
    }

    url = url.toLowerCase();

    if(location.protocol == url.substr(0, location.protocol.length)) {
      return true;
    }

    return false;
  },


  downloadLink: function(a, callback, iframe)
  {
    if(!a.href)
      return false;

    var filename = a.getAttribute('download');

    return this.download(filename, a.href, null, callback, iframe);
  },


  downloadOnClick: function(event, callback, iframe)
  {
    var _this = SaveFrom_Utils;

    var node = event.target;
    if(node.tagName != 'A')
      node = node.parentNode;

    if ( !(_this.prefs && _this.prefs.downloads) &&
      !(iframe && node.href && _this.downloadCheckProtocol(node.href)) ) {
      return;
    }

    if(event.button == 2)
      return;

    event.preventDefault();
    event.stopPropagation();

    _this.downloadLink(node, callback, iframe);
  },


  click: function(node, ctrlKey, altKey, shiftKey, button)
  {
    if(!node)
      return;

    if(!ctrlKey)
      ctrlKey = false;

    if(!altKey)
      altKey = false;

    if(!shiftKey)
      shiftKey = false;

    if(!button)
      button = 0;

    var e = document.createEvent("MouseEvents");
    e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0,
      ctrlKey, altKey, shiftKey, false, button, null);

    node.dispatchEvent(e);
  },


  parseQuery: function(query)
  {
    var k = new Array();
    var re = /[?&]?([^=]+)(?:=([^&]*))?/g;
    while(m = re.exec(query))
    {
      if(m[1] && m[2])
        k[m[1]] = m[2];
      else if(m[1])
        k[m[1]] = '';
    };
    return k;
  },


  getQueryString: function(query, key_prefix, key_suffix)
  {
    if(!query || typeof(query) != 'object')
      return '';

    if(key_prefix === undefined)
      key_prefix = '';

    if(key_suffix === undefined)
      key_suffix = '';

    var str = '';
    for(key in query)
    {
      if(str.length)
        str += '&';

      if(query[key] instanceof Object)
      {
        if(!key_prefix)
          key_prefix = '';

        if(!key_suffix)
          key_suffix = '';

        str += getQueryString(query[key], key_prefix + key + "[", "]" + key_suffix);
      }
      else
        str += key_prefix + escape(key) + key_suffix + '=' + escape(query[key]);
    }

    return str;
  },


  md5: function(str)
  {
    // http://kevin.vanzonneveld.net
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // + namespaced by: Michael White (http://getsprink.com)
    // +    tweaked by: Jack
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // -    depends on: utf8_encode
    // *     example 1: md5('Kevin van Zonneveld');
    // *     returns 1: '6e658d4bfcb59cc13f96c14450ac40b9'
    var xl;

    var rotateLeft = function (lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    };

    var addUnsigned = function (lX, lY) {
      var lX4, lY4, lX8, lY8, lResult;
      lX8 = (lX & 0x80000000);
      lY8 = (lY & 0x80000000);
      lX4 = (lX & 0x40000000);
      lY4 = (lY & 0x40000000);
      lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) {
        return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      }
      if (lX4 | lY4) {
        if (lResult & 0x40000000) {
          return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        } else {
          return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        }
      } else {
        return (lResult ^ lX8 ^ lY8);
      }
    };

    var _F = function (x, y, z) {
      return (x & y) | ((~x) & z);
    };
    var _G = function (x, y, z) {
      return (x & z) | (y & (~z));
    };
    var _H = function (x, y, z) {
      return (x ^ y ^ z);
    };
    var _I = function (x, y, z) {
      return (y ^ (x | (~z)));
    };

    var _FF = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _GG = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _HH = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _II = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var convertToWordArray = function (str) {
      var lWordCount;
      var lMessageLength = str.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = new Array(lNumberOfWords - 1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    };

    var wordToHex = function (lValue) {
      var wordToHexValue = "",
        wordToHexValue_temp = "",
        lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        wordToHexValue_temp = "0" + lByte.toString(16);
        wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
      }
      return wordToHexValue;
    };

    var x = [],
      k, AA, BB, CC, DD, a, b, c, d, S11 = 7,
      S12 = 12,
      S13 = 17,
      S14 = 22,
      S21 = 5,
      S22 = 9,
      S23 = 14,
      S24 = 20,
      S31 = 4,
      S32 = 11,
      S33 = 16,
      S34 = 23,
      S41 = 6,
      S42 = 10,
      S43 = 15,
      S44 = 21;

    //str = this.utf8_encode(str);
    x = convertToWordArray(str);
    a = 0x67452301;
    b = 0xEFCDAB89;
    c = 0x98BADCFE;
    d = 0x10325476;

    xl = x.length;
    for (k = 0; k < xl; k += 16) {
      AA = a;
      BB = b;
      CC = c;
      DD = d;
      a = _FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = _FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = _FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = _FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = _FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = _FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = _FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = _FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = _FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = _FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = _FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = _FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = _FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = _FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = _FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = _FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = _GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = _GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = _GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = _GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = _GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = _GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = _GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = _GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = _GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = _GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = _GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = _GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = _GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = _GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = _GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = _GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = _HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = _HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = _HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = _HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = _HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = _HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = _HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = _HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = _HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = _HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = _HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = _HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = _HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = _HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = _HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = _HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = _II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = _II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = _II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = _II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = _II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = _II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = _II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = _II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = _II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = _II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = _II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = _II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = _II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = _II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = _II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = _II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

    return temp.toLowerCase();
  },


  decodeHTML: function(html)
  {
    var d = document.createElement('div');
    d.innerHTML = html.replace(/</g, '&lt;').
      replace(/\>/g, '&gt;').
      replace(/\"/g, '&quot;');

    var res = d.textContent ? d.textContent : d.innerText;
    d.innerHTML = '';
    return SaveFrom_Utils.decodeUnicodeEscapeSequence(res);
  },


  decodeUnicodeEscapeSequence: function(text)
  {
    return text.replace(/\\u([0-9a-f]{4})/g, function(s, m){
      m = parseInt(m, 16);
      if(!isNaN(m))
      {
        return String.fromCharCode(m);
      }
    });
  },


  getFileExtension: function(str, def)
  {
    var ext = this.getMatchFirst(str, /\.([a-z0-9]{3,4})(\?|$)/i);
    if(ext)
      return ext.toLowerCase();

    return (def ? def : '');
  },


  getFileName: function(url)
  {
    var filename = this.getMatchFirst(url, /\/([^\?#\/]+\.[a-z\d]{2,6})(?:\?|#|$)/i);
    if(!filename)
      return filename;

    return this.fileName.modify(filename);
  },


  getTopLevelDomain: function(domain)
  {
    if(!domain)
      return '';

    if(!domain.match(/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}/))
      return domain;

    var a = domain.split('.');
    var l = a.length;

    if(l == 2)
      return domain;

    return (a[l - 2] + '.' + a[l - 1]);
  },


  dateToObj: function(ts, leadingZero)
  {
    var d = (ts === null || ts === undefined) ? new Date() : new Date(ts);

    if(leadingZero === undefined)
      leadingZero = true;

    var res = {
      year: d.getFullYear(),
      month: (d.getMonth() + 1),
      day: d.getDate(),
      hour: d.getHours(),
      min: d.getMinutes(),
      sec: d.getSeconds()
    };

    if(leadingZero)
    {
      for(var i in res)
      {
        if(res[i].toString().length == 1)
          res[i] = '0' + res[i];
      }
    }

    return res;
  },


  utf8Encode: function(str)
  {
    str = str.replace(/\r\n/g,"\n");
    var res = "";

    for (var n = 0; n < str.length; n++)
    {
      var c = str.charCodeAt(n);

      if (c < 128)
        res += String.fromCharCode(c);
      else if((c > 127) && (c < 2048))
      {
        res += String.fromCharCode((c >> 6) | 192);
        res += String.fromCharCode((c & 63) | 128);
      }
      else
      {
        res += String.fromCharCode((c >> 12) | 224);
        res += String.fromCharCode(((c >> 6) & 63) | 128);
        res += String.fromCharCode((c & 63) | 128);
      }

    }

    return res;
  },


  utf8ToWindows1251: function(str)
  {
    var res = '', i = 0, c = c1 = c2 = 0;

    var a = {
      208: {
        160: 208, 144: 192, 145: 193, 146: 194,
        147: 195, 148: 196, 149: 197, 129: 168,
        150: 198, 151: 199, 152: 200, 153: 201,
        154: 202, 155: 203, 156: 204, 157: 205,
        158: 206, 159: 207, 161: 209, 162: 210,
        163: 211, 164: 212, 165: 213, 166: 214,
        167: 215, 168: 216, 169: 217, 170: 218,
        171: 219, 172: 220, 173: 221, 174: 222,
        175: 223, 176: 224, 177: 225, 178: 226,
        179: 227, 180: 228, 181: 229, 182: 230,
        183: 231, 184: 232, 185: 233, 186: 234,
        187: 235, 188: 236, 189: 237, 190: 238,
        191: 239
      },

      209: {
        145: 184, 128: 240, 129: 241, 130: 242,
        131: 243, 132: 244, 133: 245, 134: 246,
        135: 247, 136: 248, 137: 249, 138: 250,
        139: 251, 140: 252, 141: 253, 142: 254,
        143: 255
      }
    };

    while(i < str.length)
    {
      c = str.charCodeAt(i);

      if(c < 128)
      {
        res += String.fromCharCode(c);
        i++;
      }
      else if((c > 191) && (c < 224))
      {
        if(c == 208 || c == 209)
        {
          c2 = str.charCodeAt(i + 1);
          if(a[c][c2])
            res += String.fromCharCode(a[c][c2]);
          else
            res += '?';
        }
        else
          res += '?';

        i += 2;
      }
      else
      {
        res += '?';
        i += 3;
      }
    }

    return res;
  },


  base64_encode: function(str)
  {
    var res = '';
    var c1, c2, c3, e1, e2, e3, e4;
    var key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var i = 0;

    while(i < str.length)
    {
      c1 = str.charCodeAt(i++);
      c2 = str.charCodeAt(i++);
      c3 = str.charCodeAt(i++);

      e1 = c1 >> 2;
      e2 = ((c1 & 3) << 4) | (c2 >> 4);
      e3 = ((c2 & 15) << 2) | (c3 >> 6);
      e4 = c3 & 63;

      if(isNaN(c2))
      {
        e3 = e4 = 64;
      }
      else if(isNaN(c3))
      {
        e4 = 64;
      }

      res += key.charAt(e1) + key.charAt(e2) + key.charAt(e3) + key.charAt(e4);
    }

    return res;
  },


  sizeHuman: function(size, round)
  {
    if(round == undefined || round == null)
      round = 2;

    var s = size, count = 0, sign = '', unite_spec = [
      chrome.i18n.getMessage('vkFileSizeByte'),
      chrome.i18n.getMessage('vkFileSizeKByte'),
      chrome.i18n.getMessage('vkFileSizeMByte'),
      chrome.i18n.getMessage('vkFileSizeGByte'),
      chrome.i18n.getMessage('vkFileSizeTByte'),
    ];

    if(s < 0)
    {
      sign = '-';
      s = Math.abs(s);
    }

    while(s >= 1000)
    {
      count++;
      s /= 1024;
    }

    if(round >= 0)
    {
      var m = round * 10;
      s = Math.round(s * m) / m;
    }

    if(count < unite_spec.length)
      return sign + s + ' ' + unite_spec[count];

    return size;
  },


  sendRequest: function(url, callback, method, referer, post, cookie,
    userAgent, header)
  {
    var req = new window.XMLHttpRequest();
    if (!req)
      return;

    method = method ? method : ((post) ? 'POST' : 'GET');
    //userAgent = userAgent ? userAgent : window.navigator.userAgent;

    req.open(method, url, true);

    //req.setRequestHeader('User-Agent', userAgent);
    if(referer)
    {
      req.setRequestHeader('Referer', referer);
    }
    if(cookie)
    {
      req.setRequestHeader('Cookie', cookie);
    }
    if (post)
    {
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      req.setRequestHeader("Content-Length", post.length);
    }
    if(header)
    {
      for(var i = 0; i < header.length; i++)
      {
        req.setRequestHeader(header[i][0], header[i][1]);
      }
    }

    req.onreadystatechange = function ()
    {
      if (req.readyState != 4)
        return;

      callback(req);
    };

    if (req.readyState == 4)
    {
      return;
    }

    if(post)
      req.send(post);
    else
      req.send();
  },


  secondsToDuration: function(seconds)
  {
    if(!seconds || isNaN(seconds))
      return '';

    function zfill(time)
    {
      if(time < 10)
        return '0' + time;

      return time.toString();
    }

    var hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    var minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if(hours > 0)
      return hours + ":" + zfill(minutes) + ":" + zfill(seconds);

    return minutes + ":" + zfill(seconds);
  },


  // file name
  fileName: {
    maxLength: 80,


    getParts: function(name)
    {
      return name.match(/^(.+)\.([a-z0-9]{1,4})$/i);
    },


    shorten: function(name)
    {
      name = name.substr(0, this.maxLength);
      var nws = '\\u0030-\\u0039\\u0041-\\u005a\\u005f\\u0061-\\u007a\\u00aa\\u00b5\\u00ba\\u00c0-\\u00d6\\u00d8-\\u00f6\\u00f8-\\u021f\\u0222-\\u0233\\u0250-\\u02ad\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03ce\\u03d0-\\u03d7\\u03da-\\u03f3\\u0400-\\u0481\\u048c-\\u04c4\\u04c7\\u04c8\\u04cb\\u04cc\\u04d0-\\u04f5\\u04f8\\u04f9\\u0531-\\u0556\\u0561-\\u0587\\u05d0-\\u05ea\\u05f0-\\u05f2\\u0621-\\u063a\\u0641-\\u064a\\u0660-\\u0669\\u0671-\\u06d3\\u06d5\\u06f0-\\u06fc\\u0710\\u0712-\\u072c\\u0780-\\u07a5\\u0905-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0966-\\u096f\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09dc\\u09dd\\u09df-\\u09e1\\u09e6-\\u09f1\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a66-\\u0a6f\\u0a72-\\u0a74\\u0a85-\\u0a8b\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae6-\\u0aef\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b36-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b66-\\u0b6f\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb5\\u0bb7-\\u0bb9\\u0be7-\\u0bef\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c33\\u0c35-\\u0c39\\u0c60\\u0c61\\u0c66-\\u0c6f\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cde\\u0ce0\\u0ce1\\u0ce6-\\u0cef\\u0d05-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d28\\u0d2a-\\u0d39\\u0d60\\u0d61\\u0d66-\\u0d6f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e45\\u0e50-\\u0e59\\u0e81\\u0e82\\u0e84\\u0e87\\u0e88\\u0e8a\\u0e8d\\u0e94-\\u0e97\\u0e99-\\u0e9f\\u0ea1-\\u0ea3\\u0ea5\\u0ea7\\u0eaa\\u0eab\\u0ead-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ed0-\\u0ed9\\u0edc\\u0edd\\u0f00\\u0f20-\\u0f29\\u0f40-\\u0f47\\u0f49-\\u0f6a\\u0f88-\\u0f8b\\u1000-\\u1021\\u1023-\\u1027\\u1029\\u102a\\u1040-\\u1049\\u1050-\\u1055\\u10a0-\\u10c5\\u10d0-\\u10f6\\u1100-\\u1159\\u115f-\\u11a2\\u11a8-\\u11f9\\u1200-\\u1206\\u1208-\\u1246\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1286\\u1288\\u128a-\\u128d\\u1290-\\u12ae\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12ce\\u12d0-\\u12d6\\u12d8-\\u12ee\\u12f0-\\u130e\\u1310\\u1312-\\u1315\\u1318-\\u131e\\u1320-\\u1346\\u1348-\\u135a\\u1369-\\u1371\\u13a0-\\u13f4\\u1401-\\u166c\\u166f-\\u1676\\u1681-\\u169a\\u16a0-\\u16ea\\u1780-\\u17b3\\u17e0-\\u17e9\\u1810-\\u1819\\u1820-\\u1842\\u1844-\\u1877\\u1880-\\u18a8\\u1e00-\\u1e9b\\u1ea0-\\u1ef9\\u1f00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u203f\\u2040\\u207f\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2131\\u2133-\\u2139\\u3006\\u3041-\\u3094\\u30a1-\\u30fb\\u3105-\\u312c\\u3131-\\u318e\\u31a0-\\u31b7\\u3400-\\u4db5\\u4e00-\\u9fa5\\ua000-\\ua48c\\uac00-\\ud7a3\\uf900-\\ufa2d\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe33\\ufe34\\ufe4d-\\ufe4f\\ufe70-\\ufe72\\ufe74\\ufe76-\\ufefc\\uff10-\\uff19\\uff21-\\uff3a\\uff3f\\uff41-\\uff5a\\uff65-\\uff6f\\uff71-\\uff9d\\uffa0-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc';
      var re = new RegExp('^(.+)([^' + nws + ']+)[' + nws + ']+$', 'i');
      return name.replace(re, function(str, m1, m2){
        m1 = m1.replace(/[,_\-\.]+$/g, '');
        if(m2 == ')' || m2 == ']')
          return m1 + m2;

        return m1;
      });
    },


    modify: function(name)
    {
      if(!name)
        return '';

      name = name.replace(/^\s+|\s+$/g, '');

      try
      {
        name = decodeURIComponent(name);
      }
      catch(err)
      {
        name = unescape(name);
      }

      name = SaveFrom_Utils.decodeHTML(name);

      name = name.replace(/\s+/g, ' ')
        .replace(/[\x2F\x5C\x3A\x7C]+/g, '_')
        .replace(/[\x2A\x3F\x22]/g, '')
        .replace(/\x3C/g, '(')
        .replace(/\x3E/g, ')')
        .replace(/(?:^\s+)|(?:\s+$)/g, '')
        .replace(/(\.|\!|\?|_|,|\-|\:|\+){2,1000}/g, '$1')
        .replace(/[\.,:;\/\-_\+=\x27]$/ig, '');

      if(!name)
        return '';

      if(name.length <= this.maxLength)
        return name;

      var parts = this.getParts(name);
      if(parts && parts.length == 3)
      {
        parts[1] = this.shorten(parts[1]);
        return parts[1] + '.' + parts[2];
      }

      name = this.shorten(name);
      return name;
    }
  },


  svg: {
    icon: {
      download: 'M 4,0 4,8 0,8 8,16 16,8 12,8 12,0 4,0 z',
      info: 'M 8,1.55 C 11.6,1.55 14.4,4.44 14.4,8 14.4,11.6 11.6,14.4 8,14.4 4.44,14.4 1.55,11.6 1.55,8 1.55,4.44 4.44,1.55 8,1.55 M 8,0 C 3.58,0 0,3.58 0,8 0,12.4 3.58,16 8,16 12.4,16 16,12.4 16,8 16,3.58 12.4,0 8,0 L 8,0 z M 9.16,12.3 H 6.92 V 7.01 H 9.16 V 12.3 z M 8.04,5.91 C 7.36,5.91 6.81,5.36 6.81,4.68 6.81,4 7.36,3.45 8.04,3.45 8.72,3.45 9.27,4 9.27,4.68 9.27,5.36 8.72,5.91 8.04,5.91 z',
      noSound: 'M 11.4,5.05 13,6.65 14.6,5.05 16,6.35 14.4,7.95 16,9.55 14.6,11 13,9.35 11.4,11 10,9.55 11.6,7.95 10,6.35 z M 8,1.75 8,14.3 4,10.5 l -4,0 0,-4.75 4,0 z'
    },

    cache: {},

    getSrc: function(icon, color)
    {
      if(!this.icon[icon])
        return '';

      if(!this.cache[icon])
        this.cache[icon] = {};

      if(!this.cache[icon][color])
      {
        this.cache[icon][color] = window.btoa(
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" viewBox="0 0 16 16" id="svg2" xml:space="preserve">' +
          '<path d="' + this.icon[icon] + '" fill="' + color + '" /></svg>'
        );
      }

      if(this.cache[icon][color])
        return 'data:image/svg+xml;base64,' + this.cache[icon][color];

      return '';
    }
  },


  appendDownloadInfo: function(parent, color, boxStyle, btnStyle)
  {
    if(!color)
      color = '#a0a0a0';

    var info = document.createElement('span');
    info.appendChild(document.createTextNode(chrome.i18n.getMessage('downloadTitle')));
    this.setStyle(info, {
      display: 'inline-block',
      position: 'relative',
      border: '1px solid ' + color,
      borderRadius: '5px',
      fontSize: '13px',
      lineHeight: '17px',
      padding: '2px 19px 2px 5px',
      marginTop: '5px',
      opacity: 0.9
    });

    if(boxStyle)
      this.setStyle(info, boxStyle);

    var close = document.createElement('span');
    close.innerHTML = '&times;';
    this.setStyle(close, {
      color: color,
      width: '14px',
      height: '14px',
      fontSize: '14px',
      fontWeight: 'bold',
      lineHeight: '14px',
      position: 'absolute',
      top: 0,
      right: 0,
      overflow: 'hidden',
      cursor: 'pointer'
    });

    if(btnStyle)
      this.setStyle(close, btnStyle);

    close.addEventListener('click', function(){
      info.parentNode.removeChild(info);
      chrome.extension.sendRequest({action: 'hideDownloadInfo'}, function(){});
    }, false);

    info.appendChild(close);
    parent.appendChild(info);
  },


  appendFileSizeIcon: function(link, iconStyle, textStyle, error, noBrackets, container)
  {
    var iconColor = '#333333';
    if(error)
      iconColor = '#ff0000';
    else if(iconStyle && iconStyle.color)
      iconColor = iconStyle.color;

    var s = document.createElement('img');
    s.src = SaveFrom_Utils.svg.getSrc('info', iconColor);
    s.title = chrome.i18n.getMessage(error ? 'getFileSizeFailTitle' : 'getFileSizeTitle');

    var defIconStyle = {
      width: '14px',
      height: '14px',
      marginLeft: '3px',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      cursor: 'pointer'
    };

    var defTextStyle = {
      fontSize: '75%',
      fontWeight: 'normal',
      marginLeft: '3px',
      whiteSpace: 'nowrap'
    };

    var _this = this;

    this.setStyle(s, defIconStyle);
    if(iconStyle && typeof(iconStyle) == 'object')
      this.setStyle(s, iconStyle);

    if (container) {
      container.appendChild(s);
    } else
    if(link.nextSibling == null) {
      link.parentNode.appendChild(s);
    } else
    {
      link.parentNode.insertBefore(s, link.nextSibling);
    }

    s.addEventListener("click", function(event){
      event.preventDefault();
      event.stopPropagation();

      var node = document.createElement('span');
      node.innerHTML = '...';
      _this.setStyle(node, defTextStyle);
      if(textStyle && typeof(textStyle) == 'object')
        _this.setStyle(node, textStyle);

      s.parentNode.replaceChild(node, s);

      var request = {
        action: 'getFileSize',
        url: link.href
      }

      chrome.extension.sendRequest(request, function(response){
        if(response.fileSize == 0)
        {
          node.parentNode.removeChild(node);
          _this.appendFileSizeIcon(link, iconStyle, textStyle, true, noBrackets, container);
        }
        else
        {
          if(response.fileType.search(/^audio\//i) > -1)
          {
            var seconds = link.getAttribute('data-savefrom-helper-duration', false);
            if(seconds)
            {
              seconds = parseInt(seconds);
              if(!isNaN(seconds))
              {
                var size = _this.sizeHuman(response.fileSize, 2);
                var bitrate = Math.floor((response.fileSize / seconds) / 125) + ' ' +
                  chrome.i18n.getMessage('kbps');

                if (noBrackets) {
                  node.innerHTML = size + ' ~ ' + bitrate;
                } else {
                  node.innerHTML = '(' + size + ' ~ ' + bitrate + ')';
                }
                return;
              }
            }
          }

          if (noBrackets) {
            node.innerHTML = _this.sizeHuman(response.fileSize, 2);
          } else {
            node.innerHTML = '(' + _this.sizeHuman(response.fileSize, 2) + ')';
          }
          node.title = response.fileType ? response.fileType : '';
        }
      });
    }, false);

    return s;
  },

  appendNoSoundIcon: function(link, iconStyle)
  {
    var noSoundIconColor = '#ff0000';
    if(iconStyle && iconStyle.color)
      noSoundIconColor = iconStyle.color;
    var s = document.createElement('img');
    s.src = SaveFrom_Utils.svg.getSrc('noSound', noSoundIconColor);
    s.title = chrome.i18n.getMessage('withoutAudio');

    var defIconStyle = {
      width: '14px',
      height: '14px',
      marginLeft: '3px',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      cursor: 'pointer'
    };
    SaveFrom_Utils.setStyle(s, defIconStyle);
    if(iconStyle && typeof(iconStyle) == 'object')
      SaveFrom_Utils.setStyle(s, iconStyle);

    if(link.nextSibling == null) {
      if (link.parentNode === null) {
        link.appendChild(s);
      } else {
        link.parentNode.appendChild(s);
      }
    } else
    {
      link.parentNode.insertBefore(s, link.nextSibling);
    }
  },

  video: {
    dataAttr: 'data-savefrom-video-visible',

    yt: {
      show3D: false,
      showMP4NoAudio: false,

      showFormat: {
        'FLV': true,
        'MP4': true,
        'WebM': false,
        '3GP': false,
        'Audio MP4': false,
        'Audio OGG': false
      },

      format: {
        'FLV': {
          '5': {quality: '240p'},
          '34': {quality: '360p'},
          '35': {quality: '480p'}
        },

        'MP4': {
          '18': {quality: '360p'},
          '22': {quality: '720p'},
          '37': {quality: '1080p'},
          '38': {quality: '4k'},
          '82': {quality: '360p', '3d': true},
          '83': {quality: '240p', '3d': true},
          '84': {quality: '720p', '3d': true},
          '85': {quality: '1080p', '3d': true},
          '160': {quality: '144p', 'noAudio': true},
          '133': {quality: '240p', 'noAudio': true},
          '134': {quality: '360p', 'noAudio': true},
          '135': {quality: '480p', 'noAudio': true},
          '136': {quality: '720p', 'noAudio': true},
          '137': {quality: '1080p', 'noAudio': true},
          '264': {quality: '1440p', 'noAudio': true},
          '138': {quality: '4k', 'noAudio': true}
        },

        'WebM': {
          '43': {quality: '360p'},
          '44': {quality: '480p'},
          '45': {quality: '720p'},
          '46': {quality: '1080p'},
          '242': {quality: '240p', 'noAudio': true},
          '243': {quality: '360p', 'noAudio': true},
          '244': {quality: '480p low', 'noAudio': true},
          '245': {quality: '480p med', 'noAudio': true},
          '246': {quality: '480p high', 'noAudio': true},
          '247': {quality: '720p', 'noAudio': true},
          '248': {quality: '1080p', 'noAudio': true},
          '271': {quality: '1440p', 'noAudio': true},
          '272': {quality: '4k', 'noAudio': true},
          '100': {quality: '360p', '3d': true},
          '101': {quality: '480p', '3d': true},
          '102': {quality: '720p', '3d': true}
        },

        '3GP': {
          '17': {quality: '144p'},
          '36': {quality: '240p'}
        },

        'Audio MP4': {
          '139': {quality: '48', ext: 'aac', noVideo: true},
          '140': {quality: '128', ext: 'aac', noVideo: true},
          '141': {quality: '256', ext: 'aac', noVideo: true}
        },

        'Audio OGG': {
          '171': {quality: '128', ext: 'ogg', noVideo: true},
          '172': {quality: '172', ext: 'ogg', noVideo: true}
        }
      },

      excludeItag: {
        // MP4
        '133': ['5'],        // 240
        '134': ['34', '18'], // 360
        '135': ['35'],       // 480
        '136': ['22'],       // 720
        '137': ['37'],       // 1080
        //'264': [],           // 1440p
        '138': ['38'],       // 4k
        // WebM
        '243': ['43'],       // 360
        '244': ['44'],       // 480
        '247': ['45'],       // 720
        '248': ['46']        // 1080
      },


      init: function(prefs)
      {
        SaveFrom_Utils.video.yt.show3D = prefs.ytHide3D == '0' ? true : false;
        SaveFrom_Utils.video.yt.showMP4NoAudio = prefs.ytHideMP4NoAudio == '0' ? true : false;

        var show = false;
        for(var i in SaveFrom_Utils.video.yt.showFormat)
        {
          SaveFrom_Utils.video.yt.showFormat[i] = prefs['ytHide' + i.replace(' ', '_')] == '0' ? true : false;
          if(SaveFrom_Utils.video.yt.showFormat[i])
            show = true;
        }

        if(!show)
          SaveFrom_Utils.video.yt.showFormat.FLV = true;
      },

      filterLinks: function(links)
      {
        for(var i in this.excludeItag)
        {
          if(links[i] && this.excludeItag[i].length > 0)
          {
            for(var j = 0; j < this.excludeItag[i].length; j++)
            {
              var itag = this.excludeItag[i][j];
              if(links[itag])
              {
                delete links[i];
                break;
              }
            }
          }
        }
      },


      show: function(links, parent, showDownloadInfo, style, videoTitle)
      {
        SaveFrom_Utils.video.yt.filterLinks(links);
        style = style || {};

        var content = document.createElement('div');
        SaveFrom_Utils.setStyle(content, {
          display: 'inline-block',
          margin: '0 auto'
        });
        parent.appendChild(content);

        var box = document.createElement('div');
        SaveFrom_Utils.setStyle(box, {
          display: 'inline-block',
          padding: '0 90px 0 0',
          position: 'relative'
        });
        content.appendChild(box);

        var tbl = document.createElement('table');
        SaveFrom_Utils.setStyle(tbl, {
          emptyCells: 'show',
          borderCollapse: 'collapse',
          margin: '0 auto',
          padding: '0',
          width: 'auto'
        });
        box.appendChild(tbl);

        var hidden = false;

        for(var i in SaveFrom_Utils.video.yt.format)
        {
          if(SaveFrom_Utils.video.yt.append(links, i,
            SaveFrom_Utils.video.yt.format[i], tbl, style, videoTitle))
          {
            hidden = true;
          }
        }

        for(var i in links)
        {
          if(SaveFrom_Utils.video.yt.append(links, '', null, tbl, style, videoTitle))
          {
            hidden = true;
          }

          break;
        }

        if(!hidden)
          return;

        var more = document.createElement('span');
        more.innerHTML = chrome.i18n.getMessage('more') + '&nbsp;&raquo;';
        SaveFrom_Utils.setStyle(more, {
          color: '#555',
          border: '1px solid #a0a0a0',
          borderRadius: '3px',
          display: 'block',
          fontFamily: 'Arial',
          fontSize: '15px',
          lineHeight: '17px',
          padding: '1px 5px',
          position: 'absolute',
          bottom: '3px',
          right: '0',
          cursor: 'pointer'
        });

        if(style.btn && typeof(style.btn) == 'object')
          SaveFrom_Utils.setStyle(more, style.btn);

        box.appendChild(more);

        more.addEventListener('click', function(event){
          event.preventDefault();
          event.stopPropagation();

          var e = parent.querySelectorAll('*[' + SaveFrom_Utils.video.dataAttr + ']');
          for(var i = 0; i < e.length; i++)
          {
            var visible = e[i].getAttribute(SaveFrom_Utils.video.dataAttr, false);
            var display = 'none', symbol = '&raquo;';
            if(visible == '0')
            {
              visible = '1';
              display = '';
              symbol = '&laquo;';
            }
            else
              visible = '0';

            e[i].style.display = display;
            e[i].setAttribute(SaveFrom_Utils.video.dataAttr, visible, false);
            this.innerHTML = chrome.i18n.getMessage('more') + '&nbsp;' + symbol;
          }

          return false;
        }, false);


        if(showDownloadInfo == '1')
        {
          var color = '#a0a0a0', a = tbl.querySelector('td a');

          content.appendChild(document.createElement('br'));
          SaveFrom_Utils.appendDownloadInfo(content, color, null, {
            width: '16px',
            height: '16px',
            fontSize: '16px',
            lineHeight: '16px'
          });
        }
      },


      append: function(links, title, format, parent, style, videoTitle)
      {
        var hidden = false;

        var aStyle = {
          whiteSpace: 'nowrap'
        };

        var sStyle = {
          fontSize: '75%',
          fontWeight: 'normal',
          marginLeft: '3px',
          whiteSpace: 'nowrap'
        };

        var tr = document.createElement('tr');

        var td = document.createElement('td');
        td.appendChild(document.createTextNode(title ? title : '???'));

        if(!title || !SaveFrom_Utils.video.yt.showFormat[title])
        {
          tr.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
          tr.style.display = 'none';
          hidden = true;
        }

        SaveFrom_Utils.setStyle(td, {
          border: 'none',
          padding: '3px 15px 3px 0',
          textAlign: 'left',
          verticalAlign: 'middle'
        });

        tr.appendChild(td);

        td = document.createElement('td');
        SaveFrom_Utils.setStyle(td, {
          border: 'none',
          padding: '3px 0',
          textAlign: 'left',
          verticalAlign: 'middle',
          lineHeight: '17px'
        });
        tr.appendChild(td);

        var sep = false;
        if(format)
        {
          for(var i in format)
          {
            if(links[i])
            {
              if(sep)
              {
                td.lastChild.style.marginRight = '15px';
                td.appendChild(document.createTextNode(' '));
              }

              var span = document.createElement('span');
              span.style.whiteSpace = 'nowrap';

              var a = document.createElement('a');
              a.href = links[i];
              a.title = chrome.i18n.getMessage('downloadTitle');
              a.innerHTML = format[i]['3d'] ? '3D' : format[i].quality;
              if(title === 'Audio MP4' || title === 'Audio OGG')
                a.innerHTML += ' ' + chrome.i18n.getMessage('kbps');
              if(videoTitle)
              {
                var ext = format[i]['ext'];
                if(!ext)
                  ext = title.toLowerCase();

                a.setAttribute('download', SaveFrom_Utils.fileName.modify(videoTitle + '.' + ext) );

                if(title == 'Audio MP4' || title == 'Audio OGG' || format[i]['noAudio'])
                {
                  a.addEventListener('click', function(event){
                    SaveFrom_Utils.downloadOnClick(event, null, true);
                  }, false);
                }
              }
              SaveFrom_Utils.setStyle(a, aStyle);
              if(style.link && typeof(style.link) == 'object')
                SaveFrom_Utils.setStyle(a, style.link);

              span.appendChild(a);
              SaveFrom_Utils.appendFileSizeIcon(a, style.fsIcon, style.fsText);

              if(format[i]['3d'])
              {
                if(!SaveFrom_Utils.video.yt.show3D)
                {
                  hidden = true;
                  span.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
                  span.style.display = 'none';
                }

                var s = document.createElement('span');
                s.innerHTML = format[i].quality;
                SaveFrom_Utils.setStyle(s, sStyle);
                if(style.text && typeof(style.text) == 'object')
                  SaveFrom_Utils.setStyle(s, style.text);

                a.appendChild(s);
              }

              if(format[i]['noAudio'])
              {
                if(!SaveFrom_Utils.video.yt.showMP4NoAudio)
                {
                  hidden = true;
                  span.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
                  span.style.display = 'none';
                }

                SaveFrom_Utils.appendNoSoundIcon(a, style ? style.noSoundIcon : false);
              }

              td.appendChild(span);

              sep = true;

              delete links[i];
            }
          }
        }
        else
        {
          for(var i in links)
          {
            if(sep)
            {
              td.lastChild.style.marginRight = '15px';
              td.appendChild(document.createTextNode(' '));
            }

            var span = document.createElement('span');
            span.style.whiteSpace = 'nowrap';

            var a = document.createElement('a');
            a.href = links[i];
            a.title = chrome.i18n.getMessage('downloadTitle');
            a.innerHTML = i;
            SaveFrom_Utils.setStyle(a, aStyle);
            if(style.link && typeof(style.link) == 'object')
                SaveFrom_Utils.setStyle(a, style.link);

            span.appendChild(a);
            SaveFrom_Utils.appendFileSizeIcon(a, style.fsIcon, style.fsText);
            td.appendChild(span);

            sep = true;

            delete links[i];
          }
        }

        if (sep === false) {
          return;
        }
        parent.appendChild(tr);

        return hidden;
      }
    }
  }, // video


  playlist: {
    btnStyle: {
      display: 'block',
      fontWeight: 'bold',
      border: 'none',
      textDecoration: 'underline'
    },


    getFilelistHtml: function(links)
    {
      if(!links || links.length == 0)
        return '';

      var rows = 0;
      var list = '';

      for(var i = 0; i < links.length; i++)
      {
        if(links[i].url)
        {
          list += links[i].url + '\r\n';
          rows++;
        }
      }

      if(list)
      {
        if(rows < 5)
          rows = 5;
        else if(rows > 20)
          rows = 20;

        return '<b style="font-size: 125%;">' +
           chrome.i18n.getMessage('filelistTitle') + '</b><br>' +
          '<p>' + chrome.i18n.getMessage('filelistInstruction') + '</p>' +
          '<a href="#" class="sf__playlist" style="display:none;">' +
          chrome.i18n.getMessage('playlist') + '</a><br>' +
          '<textarea rows="' + rows + '" cols="60" style="width:100%; white-space:nowrap;">' +
          list + '</textarea>';
      }

      return '';
    },


    popupFilelist: function(links, title, playlist, id)
    {
      var html = SaveFrom_Utils.playlist.getFilelistHtml(links);
      if(!html)
        return;

      var popup = SaveFrom_Utils.popupDiv(html, id);
      if(playlist)
      {
        var a = popup.querySelector('a.sf__playlist');
        if(a)
        {
          a.addEventListener('click', function(event){
            setTimeout(function(){
              SaveFrom_Utils.playlist.popupPlaylist(links, title, true, id);
            }, 100);
            event.preventDefault();
            return false;
          }, false);

          SaveFrom_Utils.setStyle(a, SaveFrom_Utils.playlist.btnStyle);
        }
      }
    },


    getM3U: function(links)
    {
      var text = '#EXTM3U\r\n';

      for(var i = 0; i < links.length; i++)
      {
        if(!links[i].duration)
          links[i].duration = '-1';

        if(links[i].title || links[i].duration)
        {
          text += '#EXTINF:' + links[i].duration + ',' +
            links[i].title + '\r\n';
        }

        text += links[i].url + '\r\n';
      }

      return text;
    },


    getPLS: function(links)
    {
      var text = '[playlist]\r\n\r\n';

      for(var i = 0; i < links.length; i++)
      {
        var num = i + 1;
        text += 'File' + num + '=' + links[i].url + '\r\n';

        if(!links[i].duration)
          links[i].duration = '-1';

        if(links[i].title || links[i].duration)
        {
          text += 'Title' + num + '=' + links[i].title + '\r\n' +
            'Length' + num + '=' + links[i].duration + '\r\n';
        }

        text += '\r\n';
      }

      text += 'NumberOfEntries=' + links.length + '\r\n\r\n' +
        'Version=2\r\n';

      return text;
    },


    getPlaylistHtml: function(links, title)
    {
      if(!links || links.length == 0)
        return '';

      var d = SaveFrom_Utils.dateToObj();
      var dateStr = d.year + '-' + d.month + '-' + d.day + '_' +
        d.hour + '-' + d.min;

      if(!title)
        title = 'playlist';

      title += '_' + dateStr;

      var html = '<b style="font-size: 125%;">' +
        chrome.i18n.getMessage('playlistTitle') + '</b><br>' +
        '<p>' + chrome.i18n.getMessage('playlistInstruction') + '</p>' +
        '<a href="#" class="sf__playlist" style="display:none;">' +
        chrome.i18n.getMessage('filelist') + '</a><br>';

      var text = chrome.i18n.getMessage('download').toLowerCase();

      // M3U
      var file = SaveFrom_Utils.playlist.getM3U(links);

      html += '<b>M3U</b>&nbsp;&nbsp;&nbsp;' +
        '<a href="data:audio/x-mpegurl;charset=windows-1251;base64,' +
        escape(SaveFrom_Utils.base64_encode(
          SaveFrom_Utils.utf8ToWindows1251(SaveFrom_Utils.utf8Encode(file)))) +
        '" download="' + title + '.m3u">' + text + '</a>' +
        '&nbsp;&nbsp; | &nbsp;&nbsp;' +
        '<a href="data:audio/x-mpegurl;charset=utf-8;base64,' +
        escape(SaveFrom_Utils.base64_encode(SaveFrom_Utils.utf8Encode(file))) +
        '" download="' + title + '_utf8.m3u">' + text + ' UTF-8</a>' +
        '<br><br><textarea rows="6" cols="60" style="width:100%;white-space:nowrap;">' +
        file + '</textarea><br><br>&nbsp;<br>';

      // PLS
      file = SaveFrom_Utils.playlist.getPLS(links);

      html += '<b>PLS</b>&nbsp;&nbsp;&nbsp;' +
        '<a href="data:audio/x-scpls;charset=windows-1251;base64,' +
        escape(SaveFrom_Utils.base64_encode(
          SaveFrom_Utils.utf8ToWindows1251(SaveFrom_Utils.utf8Encode(file)))) +
        '" download="' + title + '.pls">' + text + '</a>' +
        '&nbsp;&nbsp; | &nbsp;&nbsp;' +
        '<a href="data:audio/x-scpls;charset=utf-8;base64,' +
        escape(SaveFrom_Utils.base64_encode(SaveFrom_Utils.utf8Encode(file))) +
        '" download="' + title + '_utf8.pls">' + text + ' UTF-8</a>' +
        '<br><br><textarea rows="6" cols="60" style="width:100%;white-space:nowrap;">' +
        file + '</textarea>';

      return html;
    },


    popupPlaylist: function(links, title, filelist, id)
    {
      var html = SaveFrom_Utils.playlist.getPlaylistHtml(links, title);
      if(!html)
        return;

      var popup = SaveFrom_Utils.popupDiv(html, id);
      if(filelist)
      {
        var a = popup.querySelector('a.sf__playlist');
        if(a)
        {
          a.addEventListener('click', function(event){
            setTimeout(function(){
              SaveFrom_Utils.playlist.popupFilelist(links, title, true, id);
            }, 100);
            event.preventDefault();
            return false;
          }, false);

          SaveFrom_Utils.setStyle(a, SaveFrom_Utils.playlist.btnStyle);
        }
      }
    }
  },


  popupDiv: function(html, id, maxWidth, maxHeight, onClose)
  {
    if(!id)
      id = 'savefrom_popup_box';

    if(!maxWidth)
      maxWidth = 580;

    if(!maxHeight)
      maxHeight = 520;

    var d = document.getElementById(id);
    if(d)
      d.parentNode.removeChild(d);

    d = document.createElement('div');
    d.id = id;

    SaveFrom_Utils.setStyle(d, {
      zIndex: '9999',
      display: 'block',
      'float': 'none',
      position: 'fixed',
      left: '-10000px',
      top: '-10000px',
      margin: '0',
      padding: '0',
      opacity: '0.0',
      color: '#000',
      background: '#fff',
      border: '3px solid #c0cad5',
      borderRadius: '7px',
      overflow: 'auto'
    });

    var cnt = document.createElement('div');
    SaveFrom_Utils.setStyle(cnt, {
      display: 'block',
      'float': 'none',
      position: 'relative',
      overflow: 'auto',
      margin: '0',
      padding: '10px 15px'
    });
    cnt.innerHTML = html;

    var btn = document.createElement('img');
    btn.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAWUlEQVQ4y2NgGHHAH4j1sYjrQ+WIAvFA/B+I36MZpg8V+w9VQ9Al/5EwzDBkQ2AYr8uwaXiPQ0yfkKuwGUayIYQMI8kQqhlEFa9RLbCpFv1US5BUzSLDBAAARN9OlWGGF8kAAAAASUVORK5CYII=';
    btn.alt = 'x';
    btn.width = 18;
    btn.height = 18;
    SaveFrom_Utils.setStyle(btn, {
      position: 'absolute',
      top: '10px',
      right: '15px',
      opacity: '0.5',
      cursor: 'pointer'
    });

    btn.addEventListener('mouseover', function(){
      this.style.opacity = '0.9';
    },false);

    btn.addEventListener('mouseout', function(){
      this.style.opacity = '0.5';
    }, false);

    btn.addEventListener('click', function(){
      cnt.style.display = 'none';
      setTimeout(function(){d.parentNode.removeChild(d);}, 100);
      if (onClose) {
        onClose();
      }
      return false;
    }, false);

    cnt.appendChild(btn);
    d.appendChild(cnt);
    document.body.appendChild(d);

    if(d.offsetWidth > maxWidth)
      d.style.width = maxWidth + 'px';

    if(d.offsetHeight > maxHeight)
    {
      d.style.height = maxHeight + 'px';
      d.style.width = (maxWidth + 20) + 'px';
    }

    var l = Math.floor((window.innerWidth - d.offsetWidth) / 2.0);
    var t = Math.floor((window.innerHeight - d.offsetHeight) / 2.0);
    SaveFrom_Utils.setStyle(d, {
      top: t + 'px',
      left: l + 'px',
      opacity: '1.0'
    });

    document.addEventListener('click', function(event){
      var node = event.target;
      if(node != d && !SaveFrom_Utils.isParent(node, d))
      {
        cnt.style.display = 'none';
        setTimeout(function(){if(d.parentNode){d.parentNode.removeChild(d);}}, 100);
        document.removeEventListener('click', arguments.callee, false);
        if (onClose) {
          onClose();
        }
      }
    }, false);

    return d;
  },

  // row - used for hide tooltip on mouseout
  // because node can dissaper from DOM before mouseout raised
  showTooltip: function(node, text, row, style)
  {
    if(!node)
      return;

    var tooltip = document.querySelector('.savefrom-tooltip');
    if(!tooltip)
    {
      tooltip = document.createElement('div');
      tooltip.className = 'savefrom-tooltip';
      SaveFrom_Utils.setStyle(tooltip, {
        'position': 'absolute',
        'opacity': 0,
        'zIndex': -1
      });
      if (style) {
        SaveFrom_Utils.setStyle(tooltip, style);
      }
    }

    tooltip.innerHTML = text;

    if(tooltip.lastNode && tooltip.lastNode === node)
    {
      fixPosition();
      return;
    }

    if(tooltip.lastNode)
    {
      tooltip.lastNode.removeEventListener('mouseout', hide);
      tooltip.lastNode.removeEventListener('mousemove', fixPosition);
      tooltip.lastRow && tooltip.lastRow.removeEventListener('mouseout', hide);
    }

    tooltip.lastNode = node;
    row && (tooltip.lastRow = row);

    node.addEventListener('mouseout', hide, false);
    node.addEventListener('mousemove', fixPosition, false);
    row && row.addEventListener('mouseout', hide, false);

    document.body.appendChild(tooltip);
    fixPosition();

    function fixPosition() {
      var p = SaveFrom_Utils.getPosition(node),
          s = SaveFrom_Utils.getSize(tooltip);

      if(p.top == 0 && p.left == 0)
        return;

      p.top = p.top - s.height - 10;
      p.left = p.left - s.width / 2 + SaveFrom_Utils.getSize(node).width / 2;

      p.left = Math.min(p.left, document.body.clientWidth + document.body.scrollLeft - s.width);
      if(p.top < document.body.scrollTop)
        p.top = p.top + s.height + SaveFrom_Utils.getSize(node).height + 20;

      p.top += 'px';
      p.left += 'px';

      // show
      p.zIndex = 9999;
      p.opacity = 1;

      SaveFrom_Utils.setStyle(tooltip, p);
    }

    function hide() {
      if(tooltip.parentNode)
        document.body.removeChild(tooltip);

      tooltip.lastNode = null;
      tooltip.lastRow = null;
      SaveFrom_Utils.setStyle(tooltip, {
          zIndex: -1,
          opacity: 0
      });
      node.removeEventListener('mouseout', hide);
      node.removeEventListener('mousemove', fixPosition);
      row && row.removeEventListener('mouseout', hide);
    }
  },


  embedDownloader: {
    dataAttr: 'data-savefrom-get-links',
    dataIdAttr: 'data-savefrom-container-id',
    containerClass: 'savefrom-links-container',
    linkClass: 'savefrom-link',
    panel: null,
    lastLink: null,
    style: null,

    hostings: {
      'youtube': {
        re: [
          /^https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?.*v=([\w\-]+)/i,
          /^https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
          /^https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i,
        ],
        action: 'getYoutubeLinks',
        prepareLinks: function(links) {
          var ret = [],
              format = SaveFrom_Utils.video.yt.format;

          for(var i in format)
          {
            for(var n in format[i])
            {
              if(links[n])
              {
                var type = i;
                if(format[i][n].ext)
                  type = format[i][n].ext;

                ret.push({
                  name: i + ' ' + format[i][n].quality + (format[i][n]['3d'] ? ' (3d)' : '') +
                    ( (i === 'Audio MP4' || i === 'Audio OGG') ? (' ' + chrome.i18n.getMessage('kbps')) : ''),
                  type: type,
                  url: links[n],
                  noSound: format[i][n].noAudio
                });
              }
            }
          }

          return ret;
        }
      },

      'vimeo': {
        re: [
          /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(?:\w+\#)?(\d+)/i,
          /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i
        ],
        action: 'getVimeoLinks',
        prepareLinks: function(links) {
          return links.map(function(link) {
            var ext = link.ext;
            if(!ext)
            {
              ext = 'MP4';
              if(link.url.search(/\.flv($|\?)/i) != -1)
                ext = 'FLV';
            }

            link.name = link.name ? link.name : ext;
            link.type = link.type ? link.type : ext;
            link.ext = ext;

            return link;
          });
        }
      },

      'vk': {
        re: [
          /^https?:\/\/(?:[\w\-]+\.)?(?:vk\.com|vkontakte\.ru)\/(?:[^\/]+\/)*(?:[\w\-]+\?.*z=)?(video-?\d+_-?\d+\?list=[0-9a-z]+|video-?\d+_-?\d+)/i,
          /^https?:\/\/(?:[\w\-]+\.)?(?:vk\.com|vkontakte\.ru)\/video_ext\.php\?(.+)/i
        ],
        action: 'getVKLinks'
      },

      'dailymotion': {
        re: [
          /^http:\/\/dai\.ly\/([a-z0-9]+)_?/i,
          /^https?:\/\/(?:[\w]+\.)?dailymotion\.com(?:\/embed)?\/video\/([a-z0-9]+)_?/i
        ],
        action: 'getDailymotionLinks'
      }
    },


    init: function(style)
    {
      this.style = style;

      if(this.panel) {
        SaveFrom_Utils.popupMenu.removePanel();
      }

      this.panel = null;
      this.lastLink = null;

      var links = document.querySelectorAll('a[' + this.dataAttr + ']'),
        i, l = links.length;

      for(i = 0; i < l; i++)
      {
        if(['savefrom.net', 'sf-addon.com'].indexOf(
          SaveFrom_Utils.getTopLevelDomain(links[i].hostname)) > -1)
        {
          links[i].removeEventListener('click', this.onClick);
          links[i].addEventListener('click', this.onClick, false);
        }
      }

      // hide menu on click outside them
      // process dinamically added links
      document.body.removeEventListener('click', this.onBodyClick);
      document.body.addEventListener('click', this.onBodyClick, true);
    },


    checkUrl: function(url)
    {
      for(var h in this.hostings)
      {
        var params = this.hostings[h],
            l = params.re.length;

        for(var i = 0; i < l; i++)
        {
          var match = url.match(params.re[i]);
          if(match)
          {
            return {
              hosting: h,
              action: params.action,
              extVideoId: match[1]
            };
          }
        }
      }

      return null;
    },


    onClick: function(event, a)
    {
      var _this = SaveFrom_Utils.embedDownloader;

      if(!a)
      {
        a = event.target;
        while(a.parentNode) {
          if(a.nodeName === 'A')
            break;
          a = a.parentNode;
        }

        if(!a)
          return;
      }

      var href = a.getAttribute('data-savefrom-get-links');
      if(!href)
        return;

      if(event.button !== 0 || event.ctrlKey || event.shiftKey)
        return;

      if(_this.lastLink === a && _this.panel && _this.panel.style.display != 'none')
      {
        _this.lastLink = null;
        _this.panel.style.display = 'none';

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      _this.lastLink = a;
      var data = _this.checkUrl(href);
      if(!data)
        return;

      event.preventDefault();
      event.stopPropagation();

      var request = {
        action: data.action,
        extVideoId: data.extVideoId
      };

      chrome.extension.sendRequest(request, function(response) {
        var hosting = data.hosting;

        if(response.action != request.action)
        {
          var map = {
            'getYoutubeLinks': 'youtube',
            'getVimeoLinks': 'vimeo',
            'getDailymotionLinks': 'dailymotion'
          };

          hosting = map[response.action];
        }

        if(response.links)
          _this.showLinks(response.links, response.title, a, hosting);
        else
           _this.showLinks(chrome.i18n.getMessage('noLinksFound'), null, a);
      });

      _this.showLinks(chrome.i18n.getMessage('download') + ' ...', null, a);
      return false;
    },


    onBodyClick: function(event)
    {
      var _this = SaveFrom_Utils.embedDownloader;

      if(!_this.panel || _this.panel.style.display == 'none')
      {
        var node = event.target;
        while(node.parentNode) {
          if(node.tagName === 'A')
            break;
          node = node.parentNode;
        }

        // dinamic links
        if(node.nodeName === 'A' && node.hasAttribute(_this.dataAttr) &&
            ['savefrom.net', 'sf-addon.com'].indexOf(SaveFrom_Utils.getTopLevelDomain(node.hostname)) > -1)
        {
          return _this.onClick(event, node);
        }

        return;
      }

      node = event.target;
      while(node.parentNode) {
        if(node === _this.panel)
          return;
        node = node.parentNode;
      }

      _this.lastLink = null;
      _this.panel.style.display = 'none';
    },


    hidePanel: function()
    {
      if(this.panel)
        this.panel.style.display = 'none';
    },

    createMenu: function(links, title, a, hname) {
      var menuLinks = [];
      if (typeof links === 'string') {
        menuLinks = links;
      } else
      if (SaveFrom_Utils.popupMenu.prepareLinks[hname] !== undefined) {
        menuLinks = SaveFrom_Utils.popupMenu.prepareLinks[hname](links, title, SaveFrom_Utils);
      }
      SaveFrom_Utils.popupMenu.create({
        links: menuLinks,
        button: a,
        popupId: undefined,
        document: document,
        sfUtils: SaveFrom_Utils,
        showFileSize: true,
        containerClass: this.containerClass,
        linkClass: this.linkClass,
        style: {
          popup: (this.style)?this.style.container:undefined,
          item: (this.style)?this.style.link:undefined
        }
      });
      this.panel = SaveFrom_Utils.popupMenu.popup;
    },

    showLinks: function(links, title, a, hname)
    {
      var panel, id = a.getAttribute(this.dataIdAttr);
      if(id)
        panel = document.getElementById(id);

      if(!panel)
      {
        this.createMenu(links, title, a, hname);

        return;
      }
      else if(this.panel)
      {
        this.panel.style.display = 'none';
      }

      if(typeof(links) == 'string')
      {
        panel.innerHTML = links;
      }
      else if(!links || links.length == 0)
      {
        panel.innerHTML = chrome.i18n.getMessage('noLinksFound');
      }
      else
      {
        // append links
        if(hname && this.hostings[hname] && this.hostings[hname].prepareLinks)
          links = this.hostings[hname].prepareLinks(links);

        panel.innerHTML = '';

        for(var i = 0; i < links.length; i++)
        {
          if(links[i].url && links[i].name)
          {
            var a = document.createElement('a');
            a.href = links[i].url;
            a.title = chrome.i18n.getMessage('downloadTitle');
            a.appendChild(document.createTextNode(links[i].name));
            var span = document.createElement('span');
            span.className = this.linkClass;

            span.appendChild(a);
            panel.appendChild(span);

            SaveFrom_Utils.appendFileSizeIcon(a);
            if(links[i].noSound)
              SaveFrom_Utils.appendNoSoundIcon(a);

            if(title && !links[i].noTitle && links[i].type)
            {
              a.setAttribute('download', SaveFrom_Utils.fileName.modify(
                title + '.' + links[i].type.toLowerCase()));

              a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
            }
          }
        }
      }
    }
  },

  popupMenu: {
    popupId: 'sf_popupMenu',
    popup: undefined,
    popupStyle: undefined,
    dataArrtVisible: 'data-isVisible',

    createBadge: function(qulity, options) {
      var document = options.document;

      var container = document.createElement('div');

      options.sfUtils.setStyle(container, {
        display: 'inline-block',
        lineHeight: '18px',
        width: '19px',
        height: '17px',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '2px',
        verticalAlign: 'middle',
        textAlign: 'center',
        paddingRight: '2px',
        fontWeight: 'bolder',
        marginLeft: '3px'
      });

      if (qulity === '1080p' || qulity === '1440p' || qulity === '720p' || qulity === '720' || qulity === '1080') {
        container.textContent = 'HD';
        container.style.backgroundColor = '#505050';
        container.style.paddingRight = '1px';
      } else
      if (qulity === '4k') {
        container.textContent = 'HD';
        container.style.paddingRight = '1px';
        container.style.backgroundColor = 'rgb(247, 180, 6)';
      }
      return container;
    },

    createPopupItem: function(listItem, options) {
      var document = options.document;
      var _this = SaveFrom_Utils.popupMenu;

      var href;
      if (typeof listItem === 'string') {
        href = listItem;
      } else {
        href = listItem.href;
      }

      if (href === '-') {
        var line = document.createElement('div');
        options.sfUtils.setStyle(line, {
          display: 'block',
          margin: '1px 0',
          borderTop: '1px solid rgb(214, 214, 214)'
        });
        return {el: line};
      }

      var itemContainer = document.createElement( (href === '-text-') ? 'div' : 'a' );
      if (options.linkClass) {
        itemContainer.classList.add(options.linkClass);
      }
      var itemContainerStyle = {
        display: 'block',
        padding: '0 5px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      };
      if (listItem.isHidden) {
        itemContainer.setAttribute(_this.dataArrtVisible, '0');
        itemContainerStyle.display = 'none';
      }
      options.sfUtils.setStyle(itemContainer, itemContainerStyle);

      if (href === '-text-') {
        return {el: itemContainer};
      }

      itemContainer.href = href;

      if (href === '#') {
        return {el: itemContainer};
      }

      itemContainer.title = chrome.i18n.getMessage('downloadTitle');
      if (listItem.title && listItem.format) {
        var ext = listItem.ext;
        if(!ext) {
          ext = listItem.format.toLowerCase();
        }
        itemContainer.setAttribute('download', SaveFrom_Utils.fileName.modify(listItem.title + '.' + ext) );
        if (listItem.forceDownload) {
          itemContainer.addEventListener('click', function(event){
            options.sfUtils.downloadOnClick(event, null, listItem.useIframe || false );
          }, false);
        }
      }

      var titleContainer = document.createElement('span');
      options.sfUtils.setStyle(titleContainer, {
        cssFloat: 'left'
      });
      titleContainer.textContent = (listItem['3d'] ? '3D ':'') + (listItem.format ? listItem.format : '???') + (listItem.quality?' '+listItem.quality:'');

      if (['4k', '1440p', '1080p', '720p', '720', '1080'].indexOf( String(listItem.quality) ) !== -1) {
        titleContainer.appendChild(_this.createBadge( String(listItem.quality), options));
      }

      itemContainer.appendChild(titleContainer);


      var infoConteiner = document.createElement('span');
      options.sfUtils.setStyle(infoConteiner, {
        cssFloat: 'right',
        lineHeight: '22px',
        height: '22px'
      });
      var sizeIconStyle = {
        top: '5px',
        verticalAlign: 'top'
      };
      var sizeIconTextStyle = {
        marginLeft: 0
      };

      if (listItem.noAudio) {
        options.sfUtils.appendNoSoundIcon(infoConteiner, sizeIconStyle);
      }

      options.sfUtils.appendFileSizeIcon(itemContainer, sizeIconStyle, sizeIconTextStyle, undefined, true, infoConteiner);
      itemContainer.appendChild(infoConteiner);

      return {el: itemContainer, sizeIcon: infoConteiner.lastChild, prop: listItem};
    },

    sortMenuItems: function(list) {
      var formatPriority = ['Audio OGG','Audio MP4','3GP','WebM','FLV','MP4'];
      var strQuality = {
        Mobile: 280,
        SD: 360,
        HD: 720,
        '480p low': 478,
        '480p med': 479,
        '480p high': 480
      };
      var sizePriority = {};
      var bitratePriority = [];
      var defList = [];
      var audioList = [];
      var muteList = [];
      var _3dList = [];
      var unkList = [];
      list.forEach(function(item) {
        var prop = item.prop;
        if (!prop.format) {
          unkList.push(item);
          return 1;
        }
        if (!prop.noVideo) {
          var size = strQuality[prop.quality] || -1;
          if (size === -1) {
            if (String(prop.quality).substr(-1) === 'k') {
              size = parseInt(prop.quality) * 1000;
            } else {
              size = parseInt(prop.quality);
            }
          }
          sizePriority[prop.quality] = size;
          if (prop.noAudio) {
            muteList.push(item);
          } else
          if (prop['3d']) {
            _3dList.push(item);
          } else {
            defList.push(item);
          }
        } else {
          bitratePriority[prop.quality] = parseInt(prop.quality);
          audioList.push(item);
        }
      });
      var sizeCompare = function(a, b) {
        return sizePriority[a.quality] > sizePriority[b.quality]? -1 : sizePriority[a.quality] === sizePriority[b.quality]? 0 : 1;
      };
      var bitrateCompare = function(a, b) {
        return bitratePriority[a.quality] > bitratePriority[b.quality]? -1 : (bitratePriority[a.quality] === bitratePriority[b.quality])? 0 : 1;
      };
      var formatCompare = function(a, b) {
        if (a.noVideo && b.noVideo) {
          return bitrateCompare(a, b);
        }
        if (a.noVideo) {
          return 1;
        }
        if (b.noVideo) {
          return -1;
        }
        return formatPriority.indexOf(a.format) > formatPriority.indexOf(b.format)? -1 : formatPriority.indexOf(a.format) === formatPriority.indexOf(b.format)? 0 : 1;
      };

      var compare = function(aa, bb) {
        var a = aa.prop;
        var b = bb.prop;

        var size = sizeCompare(a, b);
        if (size !== 0) {
          return size;
        }
        return formatCompare(a, b);
      };
      defList.sort(compare);
      _3dList.sort(compare);
      audioList.sort(compare);
      muteList.sort(compare);
      return defList.concat(_3dList, audioList, muteList, unkList);
    },

    removePanel: function() {
      this.popup.parentNode.removeChild(this.popup);
      this.popupStyle.parentNode.removeChild(this.popupStyle);
      this.popup = undefined;
      this.popupStyle = undefined;
    },

    create: function(options) {
      var document = options.document;
      var button = options.button;
      var links = options.links;
      var _this = SaveFrom_Utils.popupMenu;

      if(_this.popup) {
        _this.removePanel();
      }

      var popupContainer = _this.popup = document.createElement('div');
      var containerSelector = '#'+_this.popupId;
      if (options.popupId) {
        containerSelector = '#'+options.popupId;
        popupContainer.id = options.popupId;
      } else
      if (options.containerClass) {
        containerSelector = '.'+options.containerClass;
        popupContainer.classList.add(options.containerClass);
      } else {
        popupContainer.id = _this.popupId;
      }

      var popupContainerStyle = {
        display: 'block',
        position: 'absolute',
        minHeight: '24px',
        cursor: 'default',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        fontFamily: 'arial, sans-serif'
      };

      var pos = SaveFrom_Utils.getPosition(button),
        size = SaveFrom_Utils.getSize(button);

      popupContainerStyle.top = (pos.top + size.height) + 'px';
      popupContainerStyle.left = pos.left + 'px';
      options.sfUtils.setStyle(popupContainer, popupContainerStyle);

      var popupCustomContainerStyle = {
        'background-color': '#fff',
        'z-index': '9999',
        'box-shadow': '0 2px 10px 0 rgba(0,0,0,0.2)',
        border: '1px solid #ccc',
        'border-radius': '4px',
        'font-size': '12px',
        'font-weight': 'bold',
        'min-width': '190px'
      };

      if (options.style && options.style.popup) {
        for (var key in options.style.popup) {
          var value = options.style.popup[key];
          popupCustomContainerStyle[key] = value;
        }
      }

      options.sfUtils.addStyleRules(containerSelector, popupCustomContainerStyle);

      var itemCustomStyle = {
        'line-height': '24px',
        color: '#3D3D3D'
      };

      if (options.style && options.style.item) {
        for (var key in options.style.item) {
          var value = options.style.item[key];
          itemCustomStyle[key] = value;
        }
      }

      options.sfUtils.addStyleRules(containerSelector+' '+( (options.linkClass)?'.'+options.linkClass:'a' ), itemCustomStyle);

      popupContainer.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      popupContainer.addEventListener('mouseover', function(e) {
        e.stopPropagation();
      });
      popupContainer.addEventListener('mouseup', function(e) {
        e.stopPropagation();
      });
      popupContainer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
      popupContainer.addEventListener('mouseout', function(e) {
        e.stopPropagation();
      });


      var waitGetList = [];

      if(typeof(links) === 'string') {
        var loadingItem = _this.createPopupItem('-text-', options).el;
        loadingItem.textContent = links;
        popupContainer.appendChild( loadingItem );
      } else {
        while (popupContainer.firstChild !== null) {
          popupContainer.removeChild(popupContainer.firstChild);
        }

        var items = [];
        links.forEach(function(link) {
          items.push(_this.createPopupItem(link, options));
        });

        if (items.length === 0) {
          var emptyItem = _this.createPopupItem('-text-', options).el;
          emptyItem.textContent = chrome.i18n.getMessage('noLinksFound');
          popupContainer.appendChild( emptyItem );
        }

        var hiddenList = [];

        items = _this.sortMenuItems(items);

        items.forEach(function(item) {
          if (item.prop.isHidden) {
            hiddenList.push(item.el);
            return 1;
          }
          popupContainer.appendChild(item.el);

          if (options.showFileSize) {
            waitGetList.push(item.sizeIcon);
          }
        });

        if (hiddenList.length > 0) {

          var scrollListItemCount = 8;
          if (hiddenList.length > scrollListItemCount) {
            var scrollContainer = document.createElement('div');
            scrollContainer.setAttribute(_this.dataArrtVisible, 0);

            scrollContainer.addEventListener('wheel', function(e) {
              if (e.wheelDeltaY > 0 && this.scrollTop === 0) {
                e.preventDefault();
              } else
              if (e.wheelDeltaY < 0 && this.scrollHeight - (this.offsetHeight + this.scrollTop) <= 0) {
                e.preventDefault();
              }
            });

            var hasTopShadow = false;
            scrollContainer.addEventListener('scroll', function(e) {
              if (this.scrollTop !== 0) {
                if (hasTopShadow) {
                  return;
                }
                hasTopShadow = true;
                this.style.boxShadow = 'rgba(0, 0, 0, 0.40) -2px 1px 2px 0px inset';
              } else {
                if (!hasTopShadow) {
                  return;
                }
                hasTopShadow = false;
                this.style.boxShadow = '';
              }
            });

            options.sfUtils.setStyle(scrollContainer, {
              maxHeight: (scrollListItemCount * 24)+'px',
              overflowY: 'scroll',
              display: 'none'
            });
            hiddenList.forEach(function (item) {
              scrollContainer.appendChild(item);
            });
            popupContainer.appendChild(scrollContainer);
          } else {
            hiddenList.forEach(function (item) {
              popupContainer.appendChild(item);
            });
          }

          var moreItem = _this.createPopupItem('#', options).el;
          moreItem.textContent = chrome.i18n.getMessage('more') + ' ' + String.fromCharCode(187);//171 //160 - space
          moreItem.setAttribute('data-visible', 0);
          moreItem.addEventListener('click', function(e) {
            e.preventDefault();
            var state = this.getAttribute('data-visible');
            var symbol;
            if (state > 0) {
              state--;
              symbol = 187;
            } else {
              state++;
              symbol = 171;
            }
            this.textContent = chrome.i18n.getMessage('more') + ' ' + String.fromCharCode(symbol);
            moreItem.setAttribute('data-visible', state);
            var itemList = this.parentNode.querySelectorAll('*[' + _this.dataArrtVisible + ']');
            for (var i = 0, item; item = itemList[i]; i++) {
              if (state === 1) {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
              item.setAttribute( _this.dataArrtVisible, state);
            }
          });
          var separator = _this.createPopupItem('-', options).el;
          popupContainer.appendChild(separator);
          popupContainer.appendChild(moreItem);
        }

      }

      var hoverBgColor = '#2F8AFF';
      var hoverTextColor = '#fff';
      if (options.style && options.style.hover) {
        hoverBgColor = options.style.hover.backgroundColor || hoverBgColor;
        hoverTextColor = options.style.hover.color || hoverTextColor;
      }
      var styleEl = _this.popupStyle = document.createElement('style');
      styleEl.textContent = containerSelector + ' a:hover'+
        '{'+
        'background-color: '+hoverBgColor+';'+
        'color: '+hoverTextColor+';'+
        '}'+
        containerSelector + ' > a:first-child'+
        '{'+
        'border-top-left-radius: 4px;'+
        'border-top-right-radius: 4px;'+
        '}'+
        containerSelector + ' > a:last-child'+
        '{'+
        'border-bottom-left-radius: 4px;'+
        'border-bottom-right-radius: 4px;'+
        '}';

      document.body.appendChild(styleEl);
      document.body.appendChild(popupContainer);

      setTimeout(function() {
        waitGetList.forEach(function(icon) {
          var event = new CustomEvent("click");
          icon.dispatchEvent(event);
        });
      }, 100);
    },

    prepareLinks: {
      youtube: function(links, title, sfUtils) {
        var sfUtilsYt = sfUtils.video.yt;
        sfUtilsYt.init(sfUtils.prefs);
        var titleAttr = '';
        if (title) {
          titleAttr = '&title=' + encodeURIComponent(title);
          for (var key in links) {
            links[key] += titleAttr;
          }
        }
        sfUtilsYt.filterLinks(links);

        var menuLinks = [];
        var popupLink;
        for (var format in sfUtilsYt.format) {
          var formatList = sfUtilsYt.format[format];
          for (var itag in formatList) {
            if (links[itag] === undefined) {
              continue;
            }

            var prop = formatList[itag];
            var isHidden = false;
            if (!sfUtilsYt.showFormat[format]) {
              isHidden = true;
            }
            if (prop['3d'] && !sfUtilsYt.show3D) {
              isHidden = true;
            }
            if (prop.noAudio && !sfUtilsYt.showMP4NoAudio) {
              isHidden = true;
            }

            popupLink = { href: links[itag], isHidden: isHidden, title: title, format: format };

            for (var pItem in prop) {
              popupLink[pItem] = prop[pItem];
            }

            if(format == 'Audio MP4' || format == 'Audio OGG' || prop.noAudio) {
              popupLink.forceDownload = true;
            }

            menuLinks.push(popupLink);
            delete links[itag];
          }
        }
        for (var itag in links) {
          popupLink = { href: links[itag], isHidden: true, title: title, quality: itag };
          menuLinks.push(popupLink);
          delete links[itag];
        }

        return menuLinks;
      },
      vimeo: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var ext = link.ext;
          if(!ext)
          {
            ext = 'MP4';
            if(link.url.search(/\.flv($|\?)/i) != -1)
              ext = 'FLV';
          }
          var quality = link.name ? link.name : ext;
          var format = link.type ? link.type : ext;
          format = format.toUpperCase();
          popupLink = { href: link.url, title: title, ext: ext, format: format, quality: quality, forceDownload: true, useIframe: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      vk: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var ext = link.name|| link.ext;
          var format = (ext)?ext.toUpperCase():'';
          var quality = (link.subname)?link.subname:'';
          popupLink = { href: link.url, title: title, ext: ext, format: format, quality: quality, forceDownload: true, useIframe: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      dailymotion: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var format = link.ext;
          var quality = (link.height)?link.height:'';
          popupLink = { href: link.url, title: title, ext: format, format: format, quality: quality, forceDownload: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      }
    }
  }

};

(function(){
  if (window.self == window.top || !location.hash) {
    return;
  }

  var params = location.hash.match(/sfh--download=([^\s\&]+)/i);
  if (!params) {
    return;
  }

  params = JSON.parse(decodeURIComponent(params[1]));
  if (!params.url || !params.filename) {
    return;
  }

  var a = document.createElement('a');
  a.href = params.url;
  a.download = params.filename;
  a.appendChild(document.body);

  var event = document.createEvent('MouseEvents');
  event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0,
    false, false, false, false, 0, null);

  a.dispatchEvent(event);
})();


/////////////////////////////////////////////////
// MODULE

_moduleHosts = {
  'dailymotion.com': 'dailymotion',
  'facebook.com': 'facebook',
  'odnoklassniki.ru': 'odnoklassniki',
  'ok.ru': 'odnoklassniki',
  'savefrom.net': 'savefrom',
  'soundcloud.com': 'soundcloud',
  'vimeo.com': 'vimeo',
  'vk.com': 'vk',
  'vkontakte.ru': 'vk',
  'youtube.com': 'youtube'
};

_modules = {};

_modules.dailymotion = function(){
  var iframe = false;

  if(window.top != window.self)
  {
    var m = location.href.match(/\/embed\/([\w\-]+)/i);

    if(m && m.length > 1)
    {
      iframe = true;
    }
    else
    {
      return;
    }
  }

  window.savefrom__lm = {};

  var moduleName = 'dailymotion',
      prefs = {};

  var dailymotion = {
    embed: null,
    title: '',
    styleIndex: 0,
    btnId: 'sf__download_btn',
    panelId: 'sf__download_panel',
    result: null,
    popupIsShow: false,
    hashChangeTimer: undefined,


    run: function()
    {
      if (iframe) {
        dailymotion.appendIframeButtons();
        return;
      }

      var btnBox = dailymotion.insertBtn();
      if (!btnBox) {
        var count = 0, timer = setInterval(function(){
          count++;
          btnBox = dailymotion.insertBtn();

          if(count > 5 || btnBox)
            clearInterval(timer);
        }, 1000);
      }

      clearInterval(dailymotion.hashChangeTimer);
      var loc = document.location.href;
      dailymotion.hashChangeTimer = setInterval(function(){
        if(document.location.href === loc) {
          return;
        }
        loc = document.location.href;

        var exBtn = document.getElementById(dailymotion.btnId);
        if (!exBtn) {
          dailymotion.insertBtn();
        } else {
          setTimeout(function () {
            var exBtn = document.getElementById(dailymotion.btnId);
            if (!exBtn) {
              dailymotion.insertBtn();
            }
          }, 1500);
        }
      }, 1000);

    },

    insertBtn: function() {
      var btnBox = dailymotion.getButtonBox();
      if(btnBox)
      {
        if(dailymotion.styleIndex === 2) {
          dailymotion.showLinks(btnBox, SaveFrom_Utils.getParentByClass(btnBox, 'row'));
        } else {
          dailymotion.showLinks(btnBox);
        }
      }
      return btnBox;
    },

    appendIframeButtons: function()
    {
      var p = undefined,
        b = document.createElement('div'),
        a = document.createElement('a'),
        panel = document.createElement('div');

      a.href = '#';
      a.textContent = chrome.i18n.getMessage('download').toLowerCase();
      SaveFrom_Utils.setStyle(a, {
        display: 'inline-block',
        color: 'rgba(255,255,255,.9)',
        textDecoration: 'none',
        padding: '5px 10px'
      });
      b.appendChild(a);

      SaveFrom_Utils.setStyle(b, {
        background: 'rgba(0, 0, 0, .4)',
        border: '1px solid rgba(255,255,255,.5)',
        borderRadius: '4px',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        lineHeight: 'normal',
        position: 'absolute',
        top: '5px',
        left: '5px',
        padding: 0,
        margin: 0,
        zIndex: 99999
      });

      panel.id = dailymotion.panelId;
      SaveFrom_Utils.setStyle(panel, {
        color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        border: 0,
        display: 'none',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        fontWeight: 'normal',
        lineHeight: 'normal',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        margin: 0,
        padding: '3px',
        zIndex: 99990
      });


      dailymotion.btnBox = document.createElement('div');
      dailymotion.btnBox.style.display = 'none';
      dailymotion.btnBox.appendChild(b);
      dailymotion.btnBox.appendChild(panel);

      document.removeEventListener('mouseover', dailymotion.onExtPlayerOver, false);
      document.removeEventListener('mouseout', dailymotion.onExtPlayerOver, false);
      document.addEventListener('mouseover', dailymotion.onExtPlayerOver, false);
      document.addEventListener('mouseout', dailymotion.onExtPlayerOver, false);

      a.addEventListener('click', dailymotion.fetchIframeLinks, false);
      a.addEventListener('click', dailymotion.toggleIframePanel, false);

      document.body.appendChild(dailymotion.btnBox);
    },

    onExtPlayerOver: function(event)
    {
      if(event.type == 'mouseover')
      {
        if(dailymotion.btnBox.style.display == 'none')
          dailymotion.btnBox.style.display = 'block';
      }
      else if(event.type == 'mouseout')
      {
        dailymotion.btnBox.style.display = 'none';
      }
    },

    fetchIframeLinks: function(e) {
      var a = this;
      var button = e.target;

      if(!dailymotion.result)
      {
        dailymotion.getLinks(document.body.innerHTML, function(links) {
          if (links && links.length > 0) {
            dailymotion.result = dailymotion.handleLinks(links);
            dailymotion.fillIframePanelInfo(dailymotion.result);
            return;
          }
          dailymotion.getEmbedVideoInfo(function(links){
            if(links && links.length > 0) {
              dailymotion.result = dailymotion.handleLinks(links);
              dailymotion.fillIframePanelInfo(dailymotion.result);
            } else {
              dailymotion.result = true;
              dailymotion.fillIframePanelInfo(null);
            }
          });
        });
      }

      button.removeEventListener('click', dailymotion.fetchIframeLinks, false);
      e.preventDefault();
      e.stopPropagation();
      return false;
    },

    toggleIframePanel: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var panel = document.getElementById(dailymotion.panelId);
      if(panel)
      {
        panel.style.display = (panel.style.display == 'none') ? '' : 'none';
      }
    },

    getButtonBox: function()
    {
      var parent;
      var linkContainer = document.getElementById('container_player_main');
      if (linkContainer) {
        parent = SaveFrom_Utils.getParentByClass(linkContainer, 'pl_user_featured');
        if (parent) {
          var container = parent.querySelector('#js-featured-card-counter');
          if (container) {
            dailymotion.styleIndex = 3;
            return container;
          }
        }
      }
      linkContainer = document.getElementById('main_player');
      if (linkContainer) {
        parent = document.getElementById('player_tools');
        if (parent) {
          var container = parent.querySelector('#dmpi_video_tools');
          if (container) {
            container = container.firstChild;
            if (container) {
              dailymotion.styleIndex = 4;
              return container;
            }
          }
        }
      }

      var btnBox = document.getElementById('sd_video_tools');
      if(btnBox) {
        if (btnBox.tagName !== 'UL') {
          return;
        }
        return btnBox;
      }
      btnBox = document.querySelector('div.pl_video_infos .sd_user_subscribe');
      if (btnBox) {
        dailymotion.styleIndex = 2;
        return btnBox;
      }

      parent = document.querySelector('.video_infos');
      if(parent)
      {
        var box = document.createElement('div');
        btnBox = document.createElement('ul');
        btnBox.style.textAlign = 'right';
        box.appendChild(btnBox);
        parent.appendChild(box);

        dailymotion.styleIndex = 1;
        return btnBox;
      }

      return null;
    },

    hidePopup: function(e) {
      if (dailymotion.popupIsShow === false) {
        return;
      }
      if (e !== undefined) {
        SaveFrom_Utils.embedDownloader.onBodyClick(e);
      } else {
        SaveFrom_Utils.embedDownloader.hidePanel();
        SaveFrom_Utils.embedDownloader.lastLink = null;
      }
      dailymotion.popupIsShow = SaveFrom_Utils.embedDownloader.lastLink !== null;
      if ( dailymotion.popupIsShow === false ) {
        document.removeEventListener('click', dailymotion.hidePopup, true);
      }
    },

    showLinks: function(btnBox, panelParent)
    {
      var panel = dailymotion.createPanel();

      if(btnBox)
      {
        if (dailymotion.styleIndex === 3 || dailymotion.styleIndex === 4) {
          var a = document.createElement('a');
          a.id = dailymotion.btnId;
          a.href = '#';
          if (dailymotion.styleIndex === 3) {
            a.textContent = chrome.i18n.getMessage('download');
            a.classList.add('btn');
            a.style.padding = '1px 6px';
            a.style.cssFloat = 'left';
            var icon = document.createElement('img');
            icon.src = SaveFrom_Utils.svg.getSrc('download', '#808080');
            icon.title = chrome.i18n.getMessage('download');
            SaveFrom_Utils.setStyle(icon, {
              width: '12px',
              height: '12px',
              verticalAlign: 'middle',
              opacity: '0.9',
              marginLeft: '3px'
            });
            a.appendChild(icon);
          } else {
            a.style.backgroundImage = 'url('+SaveFrom_Utils.svg.getSrc('download', '#808080')+')';
            a.style.backgroundSize = '12px';
            a.classList.add('btn');
            a.title = chrome.i18n.getMessage('download');
            SaveFrom_Utils.setStyle(a, {
              display: 'inline-block',
              height: '25px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            });
          }
          a.addEventListener('click', function(e) {
            e.preventDefault();

            var video_obj, id;
            if (dailymotion.styleIndex === 3) {
              video_obj = document.getElementById('container_player_main');
              var param = video_obj.querySelector('param[name="flashvars"]');
              if (param) {
                var data = param.getAttribute('value') || '';
                var fragment = decodeURIComponent(data.substr(data.indexOf('media_id'), 100));
                var pos = fragment.indexOf(',');
                var pos2 = fragment.indexOf(':') + 2;
                id = fragment.substr(pos2, pos - pos2 - 1);
                this.setAttribute('data-savefrom-get-links', document.location.protocol+'//dailymotion.com/video/' + id);
              } else {
                var iframe = video_obj;
                this.setAttribute('data-savefrom-get-links', iframe.getAttribute('src'));
              }
            } else
            if (dailymotion.styleIndex === 4) {
              var linkId = btnBox.querySelector('a[data-video-xid]');
              if (linkId) {
                id = linkId.getAttribute('data-video-xid');
              } else {
                id = undefined;
              }
              this.setAttribute('data-savefrom-get-links', document.location.protocol+'//dailymotion.com/video/' + id);
            }


            dailymotion.popupIsShow = true;
            SaveFrom_Utils.embedDownloader.onClick(e);
            document.removeEventListener('click', dailymotion.hidePopup, true);
            document.addEventListener('click', dailymotion.hidePopup, true);
          });
          if(dailymotion.styleIndex === 4) {
            btnBox.appendChild(a);
          } else {
            btnBox.insertBefore(a, btnBox.firstChild);
          }
          return;
        }

        panel.style.display = 'none';
        panel.style.textAlign = 'center';

        if(panelParent) {
          panelParent.parentNode.insertBefore(panel, SaveFrom_Utils.nextSibling(panelParent));
        } else {
          btnBox.parentNode.insertBefore(panel, SaveFrom_Utils.nextSibling(btnBox));
        }

        if(dailymotion.styleIndex === 2)
        {
          var li = a = document.createElement('div');
          a.id = dailymotion.btnId;
          a.className = 'button';
          a.style.height = '22px';
          a.style.padding = '0 5px';
        }
        else
        {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.id = dailymotion.btnId;
          a.className = 'dmco_simplelink button linkable';

          a.style.fontWeight = 'bold';
          a.href = '#';
          a.textContent = chrome.i18n.getMessage('download');

          li.appendChild(a);
        }

        if(dailymotion.styleIndex > 0)
        {
          var icon = document.createElement('img');
          icon.src = SaveFrom_Utils.svg.getSrc('download', '#808080');
          icon.title = chrome.i18n.getMessage('download');
          SaveFrom_Utils.setStyle(icon, {
            width: '12px',
            height: '12px',
            verticalAlign: 'middle',
            opacity: '0.9'
          });
          a.appendChild(icon);
          a.appendChild(document.createTextNode(' ' +
            chrome.i18n.getMessage('download')));
        }

        a.addEventListener('click', function(event){
          var a = this;

          if(!dailymotion.result)
          {
            var video = []; //dailymotion.getVideoInfo();
            if(video && video.length > 0)
            {
              dailymotion.result = dailymotion.handleLinks(video);
              if(dailymotion.result)
                dailymotion.fillPanelInfo(dailymotion.result);
            }
            else
            {
              dailymotion.getEmbedVideoInfo(function(links){
                if(links && links.length > 0)
                {
                  dailymotion.result = dailymotion.handleLinks(links);
                  dailymotion.fillPanelInfo(dailymotion.result);
                }
                else
                {
                  dailymotion.result = true;
                  dailymotion.fillPanelInfo(null);
                }
              });
            }
          }

          panel.style.display = (panel.style.display == 'none') ? '' : 'none';

          event.preventDefault();
          event.stopPropagation();
          return false;
        }, false);

        btnBox.appendChild(li);
      }
      else
      {
        if(dailymotion.embed)
          dailymotion.embed.parentNode.parentNode.parentNode.appendChild(panel);
        else
          document.body.insertBefore(panel, document.body.firstChild);
      }
    },


    createPanel: function()
    {
      var p = document.createElement('div');
      p.id = dailymotion.panelId;
      p.style.background = '#fff';
      p.style.fontSize = '17px';
      p.style.padding = '5px 0';

      p.appendChild(document.createTextNode(chrome.i18n.getMessage('download') + ': '));

      return p;
    },


    fillPanelInfo: function(result)
    {
      var p = document.getElementById(dailymotion.panelId);
      if(!p)
        return;

      SaveFrom_Utils.emptyNode(p);
      p.appendChild(document.createTextNode(chrome.i18n.getMessage('download') + ': '));

      if(!result || !result.length)
      {
        p.appendChild(document.createTextNode(chrome.i18n.getMessage('noLinksFound')));
        return;
      }

      var sStyle = {
        fontSize: '75%',
        fontWeight: 'normal',
        marginLeft: '3px',
        whiteSpace: 'nowrap'
      };

      var fsIconStyle = {};

      var fsTextStyle = {
        position: 'relative',
        top: '-1px'
      };

      var color = '', sep = false;
      for(var i = 0; i < result.length; i++)
      {
        if(sep)
          p.appendChild(document.createTextNode(' '));

        var a = document.createElement('a');
        a.href = result[i][0];
        a.title = chrome.i18n.getMessage('downloadTitle');

        if(dailymotion.title)
        {
          a.setAttribute('download', SaveFrom_Utils.fileName.modify(
            dailymotion.title + '.' + result[i][2].toLowerCase()));

          a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
        }

        a.innerHTML = result[i][2];
        a.style.margin = '0 0 0 10px';

        if(result[i][1])
        {
          var s = document.createElement('span');
          s.innerHTML = result[i][1];
          SaveFrom_Utils.setStyle(s, sStyle);
          a.appendChild(s);
        }

        p.appendChild(a);
        sep = true;

        SaveFrom_Utils.appendFileSizeIcon(a, fsIconStyle, fsTextStyle);

        if(!color)
          color = SaveFrom_Utils.getStyle(a, 'color');
      }

      if(result.length > 0)
      {
        if(prefs.moduleShowDownloadInfo == '1')
        {
          if(!color)
            color = 'blue';

          p.appendChild(document.createElement('br'));
          SaveFrom_Utils.appendDownloadInfo(p, color, null, {
            width: '16px',
            height: '16px',
            fontSize: '16px',
            lineHeight: '16px'
          });
        }
      }
    },

    fillIframePanelInfo: function(result)
    {
      var p = document.getElementById(dailymotion.panelId);
      if(!p)
        return;

      SaveFrom_Utils.emptyNode(p);

      if(!result || !result.length)
      {
        p.appendChild(document.createTextNode(chrome.i18n.getMessage('noLinksFound')));
        p.style.paddingTop = '11px';
        p.style.paddingBottom = '11px';
        return;
      }

      var sStyle = {
        fontSize: '75%',
        fontWeight: 'normal',
        marginLeft: '3px',
        whiteSpace: 'nowrap',
        color: '#fff'
      };

      var fsIconStyle = {
        color: '#fff',
        opacity: 0.5
      };

      var fsTextStyle = {
        position: 'relative',
        top: '-1px'
      };

      var item = document.createElement('div');
      item.style.marginTop = '8px';
      item.style.marginBottom = '8px';
      item.style.paddingLeft = '70px';
      item.style.paddingRight = '70px';
      p.appendChild(item);
      var color = '', sep = false;
      for(var i = 0; i < result.length; i++)
      {
        if(sep)
          item.appendChild(document.createTextNode(' '));

        var a = document.createElement('a');
        a.href = result[i][0];
        a.title = chrome.i18n.getMessage('downloadTitle');

        if(dailymotion.title)
        {
          a.setAttribute('download', SaveFrom_Utils.fileName.modify(
              dailymotion.title + '.' + result[i][2].toLowerCase()));

          a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
        }

        a.innerHTML = result[i][2];
        a.style.margin = '0 0 0 10px';
        a.style.color = '#fff';

        if(result[i][1])
        {
          var s = document.createElement('span');
          s.innerHTML = result[i][1];
          SaveFrom_Utils.setStyle(s, sStyle);
          a.appendChild(s);
        }

        item.appendChild(a);
        sep = true;

        SaveFrom_Utils.appendFileSizeIcon(a, fsIconStyle, fsTextStyle);

        if(!color)
          color = SaveFrom_Utils.getStyle(a, 'color');
      }

      if(result.length > 0)
      {
        if(prefs.moduleShowDownloadInfo == '1')
        {
          if(!color)
            color = 'blue';

          SaveFrom_Utils.appendDownloadInfo(p, color, null, {
            width: '16px',
            height: '16px',
            fontSize: '16px',
            lineHeight: '16px'
          });
        }
      }
    },


    handleLinks: function(video)
    {
      var result = new Array();
      var links = null;

      if(typeof(video) == 'object')
        links = video;
      else
        links = video.split('||');

      if(links && links.length > 0)
      {
        for(var i = 0; i < links.length; i++)
        {
          links[i] = links[i].replace(/\\\//g, '/');
          links[i] = links[i].replace(/\@\@[\w\-]+$/, '');
          var size = '';
          var t = links[i].match(/\/cdn\/\w+\-(\d+x\d+)\//i);
          if(t && t.length > 1)
          {
            size = t[1];
          }
          else
          {
            t = links[i].match(/\D(\d+x\d+)\D/i);
            if(t && t.length > 1)
            {
              size = t[1];
            }
          }

          var ext = 'FLV';
          var t = links[i].match(/\.(\w{1,6})(?:$|\?)/);
          if(t && t.length > 1)
          {
            ext = t[1].toUpperCase();
          }

          if(size !== '80x60')
          {
            var height = parseInt(size.split('x').slice(-1)[0]);
            result.push([links[i], height, ext]);
          }
        }
      }

      if(!result)
      {
        return null;
      }

      var sort = function(a, b){
        a = parseInt(a[1]);
        a = isNaN(a) ? 0 : a;
        b = parseInt(b[1]);
        b = isNaN(b) ? 0 : b;
        return a - b;
      };

      result.sort(sort);
      return result;
    },


    getVideoInfo: function()
    {
      var e = document.querySelectorAll('param[name="flashvars"]');
      for(var i = 0; i < e.length; i++)
      {
        var fv = e[i].getAttribute('value', false);
        if(fv)
        {
          var video = fv.match(/(?:^|&)video=([^\s\"\'\&]+)/i);
          if(video && video.length > 1)
          {
            embed = e[i];
            return decodeURIComponent(video[1]);
          }
          else
          {
            var sequence = fv.match(/(?:^|&)sequence=([^\s\"\'\&]+)/i);
            if(sequence && sequence.length > 1)
            {
              var data = decodeURIComponent(sequence[1]);
              if(data)
              {
                links = [];

                var p = ['ldURL', 'sdURL', 'hqURL', 'hdURL', 'hd\\d+URL'];
                for(var j = 0; j < p.length; j++)
                {
                  var re = new RegExp("[\\x22\\x27]" + p[j] + "[\\x22\\x27]\s*:\s*[\\x22\\x27]([^\\s\\x22\\x27]+)", "ig");
                  while(l = re.exec(data))
                  {
                    if(l && l.length > 1)
                      links.push(l[1]);
                  }
                }

                if(links)
                {
                  var t = data.match(/videoTitle=([^\s\"\'&]+)/i);
                  if(t && t.length > 1)
                    t[1] = decodeURIComponent(t[1]);
                  else
                  {
                    data = data.replace(/\\\"/g, '&quot;').replace(/'/g, '&#39;');
                    t = data.match(/[\"']videoTitle[\"']\s*:\s*[\"']([^\s\"']+)/i);
                  }

                  if(t && t.length > 1)
                  {
                    var videoTitle = t[1].replace(/\\u([\da-f]{4})/g, function(p1, p2){
                      p2 = p2.replace(/^0+/, '');
                      return String.fromCharCode(parseInt(p2, '16'));
                    });
                    dailymotion.title = videoTitle.replace(/\+/ig, ' ');
                  }

                  embed = e[i];
                  return links;
                }
              }
            }
          }
        }
      }

      var e = document.querySelectorAll('dm_widget_videoplayer');
      if(e)
      {
        for(var i = 0; i < e.length; i++)
        {
          if(e[i].innerHTML)
          {
            var fv = e[i].innerHTML.match(/flashvars=[\"\']([^\s\"\']+)/i);
            if(fv && fv.length > 1)
            {
              fv = fv[1];
              var video = fv.match(/(?:^|&)video=([^\s\"\'\&]+)/i);
              if(video && video.length > 1)
              {
                embed = e[i];
                return decodeURIComponent(video[1]);
              }
            }
          }
        }
      }


      var video = document.body.innerHTML.match(/\(\s*[\"\']video[\"\']\s*,\s*[\"\']([^\s\"\'\<\>]+)/i);
      if(video && video.length > 1)
      {
        return decodeURIComponent(video[1]);
      }

      return '';
    },

    getLinks: function(text, cb)
    {
      var links = [];
      var info = SaveFrom_Utils.getMatchFirst(text,
        /(?:var|,)\s*info\s*=\s*\{(.*?)\}\s*(?:;|,\s*\w+\s*=)/i);

      if(!info) {
        return cb();
      }
      try
      {
        info = JSON.parse('{' + info + '}');
        if(info)
        {
          dailymotion.title = info.title;
          for(var i in info)
          {
            if (!info.hasOwnProperty(i)) {
              continue;
            }
            if (!info[i]) {
              continue;
            }
            if(info[i].search(/^https?:\/\/[^\s\"]+\.(mp4|flv)(\?|$)/) > -1)
            {
              links.push(info[i]);
            }
          }
        }
      }
      catch(e){}
      cb(links);
    },

    getEmbedVideoInfo: function(callback)
    {
      if(window.location.pathname)
      {
        var url = window.location.pathname;
        if (!iframe) {
            url = "/embed" + url;
        }
        SaveFrom_Utils.sendRequest(url, function(r){
          if(r.status !== 200) {
            return callback();
          }
          dailymotion.getLinks(r.responseText, callback);
        });

        return;
      }

      callback();
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('dailymotion', response);
    prefs = response;
    SaveFrom_Utils.runModule(response, dailymotion);
  });
};

_modules.facebook = function(){
  if(window.top != window.self)
    return;

  window.savefrom__lm = {};

  var moduleName = 'facebook',
      prefs = {};

  // actions
  chrome.extension.onRequest.addListener(function(request, sender, callback){
    switch(request.action)
    {
      case 'updateLinks':
        fb.updateLinks();
        break;
    }
  });

  var fb = {
    className: 'savefrom_fb_download',
    timer: 0,

    run: function()
    {
      var _this = this;
      window.clearInterval(this.timer);

      this.updateLinks();

      var loc = document.location.href;
      this.timer = window.setInterval(function(){
        if(document.location.href != loc)
        {
          loc = document.location.href;
          _this.updateLinks();
        }
      }, 1000);
    },


    updateLinks: function()
    {
      this.removeDownloadLinks(),
      video.showLinks();

      externalMedia.run();

      SaveFrom_Utils.addStyleRules('.' + SaveFrom_Utils.embedDownloader.linkClass + ' img', {
        opacity: '.5'
      });

      SaveFrom_Utils.embedDownloader.init();
    },


    removeDownloadLinks: function()
    {
      var selector = 'a.' + this.className +
        ',div.' + this.className +
        ',span.' + this.className;

      var e = document.querySelectorAll(selector);
      for(var i = e.length-1; i >= 0; i--)
        e[i].parentNode.removeChild(e[i]);
    }
  };

  var externalMedia = {
    linkAttr: 'data-savefrom-ed',
    timer: 0,
    lastLink: null,

    re: [
      /https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?[^\s\"\'\<\>]*v=([\w\-]+)/i,
      /https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
      /https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i,
      /https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(\d+)(?:\?|$)/i,
    ],

    thumbnail: {
      youtube: {
        re: [/ytimg\.com(?:\/|%2F)vi(?:\/|%2F)([\w\-]+)(?:\/|%2F)/i],
        url: 'http://www.youtube.com/watch?v={vid}'
      }
    },


    run: function()
    {
      document.removeEventListener('mouseenter', this.onLinkHover, true);
      document.addEventListener('mouseenter', this.onLinkHover, true);

      document.removeEventListener('mouseleave', this.onLinkHover, true);
      document.addEventListener('mouseleave', this.onLinkHover, true);
    },


    onLinkHover: function(event)
    {
      var link = event.target;
      if(link.tagName != 'A')
        return;

      var attr = link.getAttribute(externalMedia.linkAttr);

      if(event.type == 'mouseenter')
      {
        if(attr)
        {
          window.clearTimeout(externalMedia.timer);
          return;
        }

        if(externalMedia.handle(link))
        {
          if(externalMedia.lastLink && externalMedia.lastLink != link)
            externalMedia.removeBtn(externalMedia.lastLink);

          SaveFrom_Utils.embedDownloader.hidePanel();
          externalMedia.lastLink = link;
        }

        return;
      }

      if(attr)
      {
        window.clearTimeout(externalMedia.timer);
        externalMedia.timer = window.setTimeout(function(){externalMedia.removeBtn(link);}, 1500);
      }
    },


    removeBtn: function(link)
    {
      if(!link || typeof(link) != 'object')
        return;

      var btn = link.querySelector('.' + fb.className);
      if(btn)
      {
        btn.parentNode.removeAttribute(this.linkAttr);
        btn.parentNode.removeChild(btn);
      }

      link.removeAttribute(this.linkAttr);

      if(link == this.lastLink)
        this.lastLink = null;
    },


    checkUrl: function(url, retry)
    {
      if(!retry && url.search(/https?:\/\/([\w\-]+\.)?facebook\.com\/l\.php/i) > -1)
      {
        return this.checkUrl(decodeURIComponent(url), true);
      }

      for(var i = 0, l = this.re.length; i < l; i++)
      {
        var m = url.match(this.re[i]);
        if(m && m.length > 0)
          return m[0];
      }
    },


    handle: function(link)
    {
      var img = link.querySelector('img');
      if(img)
      {
        var parent = img.parentNode;
        if(img.src && SaveFrom_Utils.getStyle(parent, 'position') == 'relative')
        {
          var ajaxify = link.getAttribute('ajaxify');

          if(ajaxify && ajaxify.search(/\/flash\/expand_inline/i) > -1)
          {
            var url = this.getThumbnailUrl(img.src);
            if(url)
            {
              return this.createButton(url, parent, link, {
                display: 'block',
                position: 'absolute',
                bottom: '3px',
                right: '3px',
                zIndex: 9999,
                margin: 0,
                width: '16px',
                height: '16px'
              }, {
                display: 'block'
              });
            }
          }
          else if(this.checkUrl(link.href))
          {
            return this.createButton(link.href, parent, link, {
              display: 'block',
              position: 'absolute',
              bottom: '3px',
              right: '3px',
              zIndex: 9999,
              margin: 0,
              width: '16px',
              height: '16px'
            }, {
              display: 'block'
            });
          }
        }

        return false;
      }

      return this.createButton(link.href, link, link);
    },


    getThumbnailUrl: function(url)
    {
      for(var i in this.thumbnail)
      {
        for(var j = 0; j < this.thumbnail[i].re.length; j++)
        {
          var vid = SaveFrom_Utils.getMatchFirst(url, this.thumbnail[i].re[j]);
          if(vid)
            return this.thumbnail[i].url.replace(/\{vid\}/ig, vid);
        }
      }

      return '';
    },


    createButton: function(url, parent, link, styleParent, styleIcon)
    {
      url = this.checkUrl(url);
      if(!url)
        return false;

      var btn = document.createElement('a');
      btn.className = fb.className;
      btn.href = 'http://savefrom.net/?url=' + encodeURIComponent(url);
      btn.setAttribute(SaveFrom_Utils.embedDownloader.dataAttr, url);

      SaveFrom_Utils.setStyle(btn, {
        marginLeft: '7px',
        verticalAlign: 'middle'
      });

      if(styleParent)
        SaveFrom_Utils.setStyle(btn, styleParent);

      var icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = SaveFrom_Utils.svg.getSrc('download', '#a2db16');
      SaveFrom_Utils.setStyle(icon, {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        verticalAlign: 'middle',
        //opacity: '0.9',
        cursor: 'pointer'
      });

      if(styleIcon)
        SaveFrom_Utils.setStyle(icon, styleIcon);

      btn.appendChild(icon);

      link.setAttribute(this.linkAttr, '1');
      parent.appendChild(btn);

      return true;
    }
  };


  var video = {
    getParent: function()
    {
      return document.querySelector('.videoStage');
    },


    getLinks: function(parent, callback)
    {
      var count = 0, _this = this;

      var func = function(){
        var embed = parent.querySelector('embed');
        if(embed)
        {
          callback.call(_this, _this.getLinksFromEmbed(embed));
          return;
        }

        var video = parent.querySelector('video');
        if(video)
        {
          callback.call(_this, _this.getLinksFromVideo(video));
          return;
        }

        count++;
        if(count > 10)
          callback.call(_this, null);

        window.setTimeout(func, 1000);
      };

      setTimeout(func, 1000);
    },


    getLinksFromEmbed: function(embed)
    {
      if(!embed)
        return null;

      var fv = embed.getAttribute('flashvars');
      if(!fv)
        return null;

      var params = SaveFrom_Utils.getMatchFirst(fv, /params=([^\s&]+)/i);
      if(!params)
        return null;

      params = decodeURIComponent(params);
      params = JSON.parse(params);
      if(!params || !params.video_data)
        return null;

      var links = {};
      for(var i = 0; i < params.video_data.length; i++)
      {
        if(params.video_data[i].sd_src)
          links[params.video_data[i].sd_src] = 'SD';

        if(params.video_data[i].hd_src)
          links[params.video_data[i].hd_src] = 'HD';
      }

      return links;
    },


    getLinksFromVideo: function(video)
    {
      if(!video)
        return null;

      var links = {};
      if(video.src)
      {
        var ext = SaveFrom_Utils.getFileExtension(video.src, 'mp4');
        links[video.src] = ext.toUpperCase();
      }

      var src = video.querySelectorAll('source');
      if(src && src.length > 0)
      {
        for(var i = 0; i < src.length; i++)
        {
          var ext = SaveFrom_Utils.getFileExtension(src[i].src, 'mp4');
          links[src[i].src] = ext.toUpperCase();
        }
      }

      return links;
    },


    showLinks: function()
    {
      var parent = this.getParent();
      if(!parent)
        return;

      var _this = this;
      var links = this.getLinks(parent, function(links){
        _this.appendLinks(links, parent);
      });
    },


    getFileName: function(url)
    {
      var name = SaveFrom_Utils.getFileName(url);
      if(name)
        return name;

      var d = SaveFrom_Utils.dateToObj();
      var dateStr = d.year + '-' + d.month + '-' + d.day + '_' +
        d.hour + '-' + d.min;

      return 'facebook_' + dateStr + '.' +
        SaveFrom_Utils.getFileExtension(url, 'mp4');
    },


    appendLinks: function(links, parent)
    {
      if(!links)
        return;

      var box = SaveFrom_Utils.getElementByIds(['fbPhotoPageMediaInfo',
        'fbPhotoSnowliftMediaTitle']);

      if(!box || box.querySelector('.' + fb.className))
        return;

      var panel = document.createElement('div');
      panel.className = fb.className;
      panel.style.fontWeight = 'bold';

      panel.appendChild(document.createTextNode(chrome.i18n.getMessage('download') + ': '));

      var found = false;
      for(var i in links)
      {
        if(found)
          panel.appendChild(document.createTextNode('|'));

        found = true;
        var a = document.createElement('a');
        a.href = i;
        a.target = '_blank';
        a.className = fb.className;
        a.innerHTML = links[i];
        a.title = chrome.i18n.getMessage('downloadTitle');
        a.setAttribute('download', this.getFileName(i));
        a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
        a.style.marginLeft = '5px';
        a.style.marginRight = '5px';
        panel.appendChild(a);
      }

      if(!found)
        panel.appendChild(document.createTextNode(chrome.i18n.getMessage('noLinksFound')));

      if(box.id == 'fbPhotoSnowliftMediaTitle')
      {
        panel.style.display = 'inline';
        panel.style.marginRight = '20px';
        panel.style.lineHeight = '33px';
        box.insertBefore(panel, box.firstChild);
      }
      else
      {
        box.appendChild(panel);
      }
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('facebook', response);
    prefs = response;
    SaveFrom_Utils.runModule(response, fb);
  });
};

_modules.odnoklassniki = function(){
  if(window.top != window.self)
    return;

  window.savefrom__lm = {};

  var moduleName = 'odnoklassniki',
      prefs = {};

  function showVideoLinks(id, response)
  {
    //console.log('ok showVideoLinks', response);
    var parent = document.getElementById(id);
    video.show(response.links, response.title, parent, video.style, response.action);
  }


  // actions
  chrome.extension.onRequest.addListener(function(request, sender, callback){
    switch(request.action)
    {
      case 'updateLinks':
        updateLinks();
        break;

      case 'downloadMP3Files':
        audio.showListOfAudioFiles(false);
        break;

      case 'downloadPlaylist':
        audio.showListOfAudioFiles(true);
        break;
    }
  });


  var downloadLinkClassName = 'savefrom_ok_download';
  var titleTimer = 0;


  function updateLinks()
  {
    removeDownloadLinks();
    audio.showLinks();
    video.showLinks();
  }


  function createTextLink(href, text, blank) {
    if(blank == undefined)
      blank = true;

    var a = document.createElement('a');
    a.href = href;
    a.className = downloadLinkClassName;
    a.innerHTML = text;

    if(blank)
      a.setAttribute('target', '_blank', false);

    return a;
  }


  function removeDownloadLinks()
  {
    var selector = '.' + downloadLinkClassName;

    var e = document.querySelectorAll(selector);
    for(var i = e.length-1; i >= 0; i--)
      e[i].parentNode.removeChild(e[i]);
  }



  ///////////////////////////////////////////////////////////////////
  //  AUDIO

  var audio = {
    downloadIdPrefix: 'savefrom_ok_audio_download_',
    infoIdPrefix: 'savefrom_ok_audio_info_',
    lastRow: null,
    lastRowCandidate: null,
    timer: 0,
    jsessionId: '',
    scriptNode: null,
    cache: {},
    ajaxTimer: {},


    showRowElements: function(row, show, force)
    {
      if(!row)
        return;

      var node = row.querySelectorAll('div.' + downloadLinkClassName);

      if(show && (!node || node.length == 0))
      {
        if(!audio.showRowLinks(row))
          return;

        node = row.querySelectorAll('div.' + downloadLinkClassName);
      }

      if(node && node.length > 0)
      {
        var d = show ? '' : 'none';
        for(var i = 0; i < node.length; i++)
        {
          node[i].style.display = d;
        }
      }
    },


    getNodeTrackId: function(node)
    {
      var query = node.getAttribute('data-query');
      if(query)
      {
        try
        {
          query = JSON.parse(query);
          if(query && query.trackId)
            return query.trackId;
        }
        catch(Err)
        {
          return null;
        }
      }

      return null;
    },


    getTrackId: function(parent)
    {
      if(!parent)
        return null;

      var trackId = audio.getNodeTrackId(parent);
      if(trackId)
      {
        var links = {};
        links[trackId] = parent;
        return links;
      }

      var id = parent.id;
      if(id)
      {
        id = SaveFrom_Utils.getMatchFirst(id, /^\w+_(\d+)$/i);
        if(id)
        {
          var links = {};
          links[id] = parent;
          return links;
        }
      }

      return null;
    },


    showRowLinks: function(row)
    {
      var links = audio.getTrackId(row);
      for(var i in links)
      {
        if(audio.handleRow(i, links[i]))
          return true;
      }

      return false;
    },


    showLinks: function()
    {
      if(audio.scriptNode && audio.scriptNode.parentNode)
      {
        audio.scriptNode.parentNode.removeChild(audio.scriptNode);
        audio.scriptNode = null;
      }

      var s = document.createElement('script');
      s.text = '(function(){\
        if(window.pageCtx && window.pageCtx.jsessionId)\
        {\
          document.body.setAttribute(\'data-ok-jsession-id\', window.pageCtx.jsessionId);\
        }\
      })();';
      document.body.appendChild(s);
      audio.scriptNode = s;

      var jsessionId = document.body.getAttribute('data-ok-jsession-id');
      if(!jsessionId)
        return;

      audio.jsessionId = jsessionId;
      audio.cache = {};

      for(var i in audio.ajaxTimer)
        window.clearTimeout(audio.ajaxTimer[i]);

      audio.ajaxTimer = {};

      document.removeEventListener('mouseover', audio.onMouseOver, false);
      document.removeEventListener('mouseout', audio.onMouseOut, false);

      document.addEventListener('mouseover', audio.onMouseOver, false);
      document.addEventListener('mouseout', audio.onMouseOut, false);
    },


    getLink: function(trackId)
    {
      if(!trackId || !audio.jsessionId)
        return;

      audio.ajaxTimer[trackId] = window.setTimeout(function(){
        delete audio.ajaxTimer[trackId];
        audio.deleteLink(trackId);
      }, 30000);

      chrome.extension.sendRequest({
        action: 'getOdnoklassnikiAudioLinks',
        trackId: trackId,
        jsessionId: audio.jsessionId
      }, function(response){
        audio.setLink(response.trackId, response.data);
      });
    },


    onMouseOver: function(event)
    {
      var node = event.target;
      var row = SaveFrom_Utils.getParentByClass(node, ['m_portal_track', 'm_c_tr', 'mus-tr_i']);
      if(row)
      {
        audio.lastRowCandidate = row;
        window.clearTimeout(audio.timer);

        if(audio.lastRow == row)
          return;

        audio.timer = window.setTimeout(function(){
          audio.showRowElements(audio.lastRow, false);
          audio.lastRow = row;
          audio.lastRowCandidate = null;
          audio.showRowElements(audio.lastRow, true);
        }, 250);
      }
    },


    onMouseOut: function(event)
    {
      if(!audio.lastRow && !audio.lastRowCandidate)
        return;

      var node = event.target;
      if(SaveFrom_Utils.isParent(node, audio.lastRow) ||
        SaveFrom_Utils.isParent(node, audio.lastRowCandidate))
      {
        window.clearTimeout(audio.timer);
        audio.timer = window.setTimeout(function(){
          audio.showRowElements(audio.lastRow, false);
          audio.lastRow = null;
          audio.lastRowCandidate = null;
        }, 1000);
      }
    },


    handleRow: function(trackId, row)
    {
      if(!trackId || !row)
        return false;

      var parent = row;
      parent.style.position = 'relative';

      var duration = row.querySelector('.m_c_duration, .m_portal_duration');

      var box = document.createElement('div');
      box.className = downloadLinkClassName;
      SaveFrom_Utils.setStyle(box, {
        color: '#fff',
        background: '#46aa19',
        border: '1px solid #337d12',
        borderRadius: '3px',
        padding: '1px 5px',
        position: 'absolute',
        right: '40px',
        top: '50%',
        lineHeight: '15px',
        opacity: 0,
        zIndex: 9999,
        cursor: 'pointer'
      });

      box.addEventListener('click', audio.onBoxClick, false);

      var title = audio.getTitle(trackId, row);

      var link1 = createTextLink('#', '...');
      link1.id = audio.downloadIdPrefix + trackId;
      link1.title = chrome.i18n.getMessage('downloadTitle');
      if(duration)
      {
        link1.setAttribute('data-savefrom-helper-duration',
          audio.secondsFromDurationNode(duration));
      }

      if(title)
      {
        title += '.mp3';
        link1.setAttribute('download', SaveFrom_Utils.fileName.modify(title));
      }

      SaveFrom_Utils.setStyle(link1, {
        color: '#fff',
        fontWeight: 'normal'
      });

      link1.addEventListener('click', audio.onDownloadLinkClick, false);

      box.appendChild(link1);
      parent.appendChild(box);

      if(audio.cache[trackId])
        audio.setLinkFromCache(trackId, link1);
      else
        audio.getLink(trackId);

      box.style.marginTop = '-' + (box.offsetHeight / 2) + 'px';
      box.style.opacity = '1';

      var close = document.createElement('span');
      close.innerHTML = '&times;';
      close.title = chrome.i18n.getMessage('close');
      SaveFrom_Utils.setStyle(close, {
        color: '#fff',
        fontFamily: 'Tahoma,Helvetica,sans-serif',
        fontSize: '15px',
        marginLeft: '7px',
        opacity: '.7',
        cursor: 'pointer'
      });
      close.addEventListener('click', audio.onCloseBtnClick, false);
      box.appendChild(close);

      return true;
    },


    onBoxClick: function(event)
    {
      event.preventDefault();
      event.stopPropagation();

      var a = this.querySelector('a.' + downloadLinkClassName);
      if(a)
      {
        SaveFrom_Utils.click(a, event.ctrlKey, event.altKey, event.shiftKey, event.button);
        return false;
      }

      this.style.display = 'none';
      return false;
    },


    onDownloadLinkClick: function(event)
    {
      if(event.button == 2)
        return false;

      event.stopPropagation();

      if(this.href == '#')
      {
        event.preventDefault();
        return false;
      }

      SaveFrom_Utils.downloadOnClick(event);
      return false;
    },


    onCloseBtnClick: function(event)
    {
      if(event.button == 2)
        return true;

      event.preventDefault();
      event.stopPropagation();

      parent = SaveFrom_Utils.getParentByClass(this, downloadLinkClassName);
      if(parent)
        parent.style.display = 'none';

      return false;
    },


    deleteLink: function(trackId, node)
    {
      if(!node && trackId)
        node = document.getElementById(audio.downloadIdPrefix + trackId);

      if(!node)
        return;

      var parent = SaveFrom_Utils.getParentByClass(node, downloadLinkClassName);
      if(parent)
      {
        parent.parentNode.removeChild(parent);
        return;
      }
    },


    getHash: function(src, magic)
    {
      if(!magic)
        magic = [4,3,5,6,1,2,8,7,2,9,3,5,7,1,4,8,8,3,4,3,1,7,3,5,9,8,1,4,3,7,2,8];

      var a = [];
      for(var i = 0; i < src.length; i++)
      {
        a.push(parseInt('0x0' + src.charAt(i)));
      }

      src = a;

      var res = [];
      src = src.slice(0);
      src[32] = src[31];
      var sum = 0;
      var i = 32;
      while(i-- > 0)
        sum += src[i];

      for(x = 0; x < 32; x++)
        res[x] = Math.abs(sum - src[x + 1] * src[x] * magic[x]);

      return res.join('');
    },


    setLinkFromCache: function(trackId, node)
    {
      if(!audio.cache[trackId])
        return false;

      if(!node)
        node = document.getElementById(audio.downloadIdPrefix + trackId);

      if(!node)
        return;

      node.href = audio.cache[trackId].url;
      node.innerHTML = '';
      if(audio.cache[trackId].downloadAttr)
        node.setAttribute('download', audio.cache[trackId].downloadAttr);

      var icon = document.createElement('img');
      icon.src = SaveFrom_Utils.svg.getSrc('download', '#ffffff');
      icon.title = chrome.i18n.getMessage('download');
      SaveFrom_Utils.setStyle(icon, {
        width: '16px',
        height: '16px',
        verticalAlign: 'middle',
        opacity: '0.9'
      });
      node.appendChild(icon);

      var info = document.createTextNode(audio.cache[trackId].info);

      if(node.nextSibling)
        node.parentNode.insertBefore(info, node.nextSibling);
      else
        node.parentNode.appendChild(info);

      return true;
    },


    setLink: function(trackId, data, clientHash)
    {
      if(!trackId)
        return;

      window.clearTimeout(audio.ajaxTimer[trackId]);

      var node = document.getElementById(audio.downloadIdPrefix + trackId);
      if(!node)
        return;

      if(audio.setLinkFromCache(trackId, node))
        return;

      if(!data || !data.play)
      {
        audio.deleteLink(trackId, node);
        node.innerHTML = '?';
        return;
      }

      if(clientHash === undefined)
      {
        var md5 = data.play.match(/(?:\?|&)md5=([\da-f]{32})/i);
        if(md5 && md5.length > 1)
        {
          md5 = md5[1];
          try
          {
            md5 = SaveFrom_Utils.md5(md5 + 'secret');
            audio.setLink(trackId, data, audio.getHash(md5));
            return;
          }
          catch(err)
          {
          }
        }

        audio.deleteLink(trackId, node);
        return;
      }

      var size = SaveFrom_Utils.getMatchFirst(data.play, /(?:\?|&)size=(\d+)/i);
      if(!size)
        return;

      audio.cache[trackId] = {};
      audio.cache[trackId].url = data.play + (clientHash ? '&clientHash=' + clientHash : '');

      var info = ' (' + SaveFrom_Utils.sizeHuman(size, 2);

      var duration = node.getAttribute('data-savefrom-helper-duration');
      if(data.track)
      {
        if(data.track.duration)
          duration = data.track.duration;

        if(data.track.ensemble && data.track.name)
        {
          var title = data.track.ensemble + ' - ' + data.track.name;
          audio.cache[trackId].title = title;
          audio.cache[trackId].downloadAttr = SaveFrom_Utils.fileName.modify(title + '.mp3');
        }
      }

      if(size && duration)
      {
        duration = parseInt(duration);
        if(isNaN(duration))
        {
          delete audio.cache[trackId];
          return;
        }

        var bitrate = Math.floor((size / duration) / 125) + ' ' + chrome.i18n.getMessage('kbps');
        info += ' ~ ' + bitrate;
      }

      info += ')';
      audio.cache[trackId].info = info;

      audio.setLinkFromCache(trackId, node);
    },


    getTitle: function(id, row)
    {
      if(!id || !row)
        return '';

      var name = '';

      var performer = row.querySelector('.m_c_artist, .mus-tr_artist, .m_portal_c_artist');
      var title = row.querySelector('.m_track_source, .mus-tr_song, .m_portla_track_name');

      if(performer)
      {
        performer = performer.textContent;
        if(performer)
          name += SaveFrom_Utils.trim(performer);
      }

      if(title)
      {
        title = title.textContent;
        if(title)
        {
          if(name)
            name += ' - ';

          name += SaveFrom_Utils.trim(title);
        }
      }

      if(name)
        return name.replace(/\<a\s+[^\>]+\>/ig, '').replace(/\<\/a\>/ig, '');

      return '';
    },


    secondsFromDurationNode: function(node)
    {
      if(!node)
        return 0;

      var text = node.innerText;
      if(!text)
        return 0;

      var m = text.match(/^(?:\s*(\d+)\s*\:)?\s*(\d+)\s*\:\s*(\d+)/);
      if(m && m.length > 3)
      {
        if(!m[1])
          m[1] = 0;

        return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
      }

      return 0;
    },


    showListOfAudioFiles: function(playlist)
    {
    }
  };

  //  /AUDIO
  ///////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////
  //  VIDEO

  var video = {
    popupTimer: 0,
    panelId: 'savefrom__ok_video_links_',
    panelCount: 0,
    parentDataAttr: 'data-savefrom-video-container',
    titleTimer: 0,

    style: {fontSize: '10pt', margin: '15px 0', padding: '0'},

    inline: {
      'feed_panel_activity': {selector: 'img.vid-card_img'},
      'share_card': {selector: 'img.vid-card_img'},
      'dsub': {selector: 'img.cthumb_img'},
      'd_comment_w_center': {selector: '.videomail_Thumb img', parent: true},
      'd_comment_right_w': {selector: '.vid-card_img_w img', parent: true},
      'media-layer-new_hld': {'selector': 'img.vid-card_img'}
    },

    reImg: {
      'getYoutubeLinks': /(?:\/|\.)ytimg\.com\/vi\/([\w\-]+)/i,
      'getVimeoLinks': /(?:\/|\.)vimeocdn\.com\/ts\/(.+)/i,
      'getOdnoklassnikiLinks': /\.mail\.ru\/media\/(OK_\d+_\d+)/i,
      'getOdklLinks': /\.mycdn\.me\/getImage\?(?:.+&)?id=(\d+)/i,
      'getDailymotionLinks': /\.dmcdn\.net\/(\w+)\//i
    },


    appendButton: function(links, title, style, request, parent, parentClass)
    {
      if(!parent)
        return;

      if(parent.getAttribute(video.parentDataAttr))
        return;

      parent.setAttribute(video.parentDataAttr, '1');

      if(!parentClass || !video.inline[parentClass] || !video.inline[parentClass].parent)
      {
        var newParent = parent.querySelector('ul.controls-list');
        if(!newParent)
          return;

        parent = newParent;
      }

      if(parent.querySelector('.' + downloadLinkClassName))
        return;

      var box = document.createElement('li');
      box.className = downloadLinkClassName + ' controls-list_item';

      var a = document.createElement('a');
      a.href = '#';
      a.className = 'al';
      a.textContent = chrome.i18n.getMessage('download');
      a.style.fontWeight = 'bold';
      box.appendChild(a);

      parent.appendChild(box);

      var panel = document.createElement('div');
      panel.className = downloadLinkClassName + ' al';
      panel.id = video.panelId + video.panelCount;
      video.panelCount++;
      panel.style.textDecoration = 'none';

      a.setAttribute('data-savefrom-video-box', panel.id);

      var panelParent = parent, popupPlayer = false;
      if(SaveFrom_Utils.hasClass(parent, 'vp_ac'))
      {
        panel.style.display = 'none';
        style.backgroundColor = '#d0d0d0';
        style.padding = '10px 0';
        panelParent = parent.parentNode.parentNode;

        var player = SaveFrom_Utils.getElementByIds(
          ['VideoPopup_playerObject', 'VideoPopup_player']);

        if(player)
        {
          popupPlayer = true;
          panelParent = player.parentNode;
          style.margin = '0';
          style.position = 'absolute';
          style.bottom = '50px';
          style.left = 0;
          style.right = 0;
          style.zIndex = 10;
        }
      }

      if(popupPlayer)
      {
        panelParent.appendChild(panel);
      }
      else if(panelParent.nextSibling)
      {
        panelParent.parentNode.insertBefore(panel, panelParent.nextSibling);
      }
      else
      {
        panelParent.parentNode.appendChild(panel);
      }

      a.addEventListener('click', function(event){
        event.stopPropagation();
        event.preventDefault();

        var node = event.target;
        var id = node.getAttribute('data-savefrom-video-box');
        if(!id)
          return;

        var panel = document.getElementById(id);
        if(!panel)
          return;

        if(panel.getAttribute('data-savefrom-video') == 'active')
        {
          panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
          return false;
        }

        panel.setAttribute('data-savefrom-video', 'active');
        panel.style.display = 'block';

        if(links)
        {
          video.count++;
          video.show(links, title, panel, style);
        }
        else if(request)
        {
          video.show('<img src="data:image/gif;base64,R0lGODlhHgAKAKEAAPz+3Pz+/Pz+5P///yH/C05FVFNDQVBFMi4wAwEAAAAh+QQIAwAAACwAAAAAHgAKAAACQpwTpovrrYIQQCQ2643ZjgCE4gaKIWmeVCooq9karzibVyoe+D4avL6rVVy42EBowaFSS9tn5cGEopzp5nN9ZBmbAgAh+QQIAwAAACwAAAAAHgAKAIL8/rz8/uT8/tT8/vT8/sT8/tz8/vz///8DWXhqpv7syeiGIESMGUIJDdR9zUAAKEBsS+G+4TG8sJCmguPRn85/J1WKEPq5FjteEHUiKoyFltEmROUUyVfAxwuYbiuH4Rcb80qXDEu8A3FcbnFMcqDQ67EEACH5BAgDAAAALAAAAAAeAAoAg/z2pPz+3Pz+vPz+9Pz6pPz+5Pz+xPz+/Pz6rP///wAAAAAAAAAAAAAAAAAAAAAAAAReMMlzpL306myHQIgwbEURFBVWntVAEEBMjNIQ3Hia2Ph9CADYCyCwmHqnDvIkDMpSy9skGhgKX9DoNApsEo3LghJZcDlftN1Sx+u1BC+BWHVDaQbH8mWQ1iQ4fn86EQAh+QQIAwAAACwAAAAAHgAKAIP82oT8/tz86qz8/vz84oz8+uz83oz8/uT///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAEVRDJMaS99OpsiyCEUGzHERwVVp5VYQAwYIxTYN8pMty4EMcCi4l3EhJPr58sdbTVmkkls/k8+pRByZB3MBIPLiVNd8ztiC2BwSAi2VBuFian0dE3uQgAIfkECAMAAAAsAAAAAB4ACgCD/Lpk/Pbk/NaU/MJs/P78/P7c/MZ0/L5k/MJ0/P7k////AAAAAAAAAAAAAAAAAAAABGBQSUKkvfTqbIMwiBBsSVIkFVaeVWAAMICMU2HfqULcuAAfAKDAYuKdiMbTIMg8HFJFYy1ZWAKviBS1ME36gL+hJHpLII2JAOJ6mFl2xhyc1/qEaO8iimTbv3MaOoAbOREAIfkECAMAAAAsAAAAAB4ACgCD/J5E/PLk/MKE/KZU/P7c/KpU/P78/J5M/P7k/Kpc////AAAAAAAAAAAAAAAAAAAABF9QSWOkvfTqbIMoiRBsCEEgFYaUqBIUBxAX42TeRKoYuGkIAFnwILCUeghj7zQQxgCD1NJkmzZjh1hUMiVUl8CnrCg54pLlJeIlm9V2Sx2vV/GARCRTS6XX7fwbgBg6EQAh+QQIAwAAACwAAAAAHgAKAIPsgiz87tz8rmz0jjz8/tz8/vz0ijT8rnT0kjz8/uT///8AAAAAAAAAAAAAAAAAAAAEW1DJUqS99Opsw0HIEWwJQSQVlpSoEgxADAzjZN5EqhS4WQgymcBS6iWIvZMhGDOkkiYbdMl0SqAEaRLIHEqKuOM3mXgFaRZeT6fGVTwgQS1dbKlM9olOs9tvdBEAIfkECAMAAAAsAAAAAB4ACgCD/J5E/P68/PLk/MKE/KZU/P7U/P7k/KpU/P70/J5M/P7E/P7c/Kpc/P78////AAAABHPQydakvfTqbMU4zCBoSKEoBbIZxmJUwpEA8zFKiBLsgaJOi6CwMQDQjImBpcDjFSwtYdBAOM4AhIqjqesBpcLqLDHLSnTdXuALXhSvNKWEues+JVGpIUar3Rw5XD8ODW0wHyF/OCYogxNRLxiOG1oaE5URACH5BAgDAAAALAAAAAAeAAoAhPy6ZPz2pPz25PzWlPz+9PzCbPz+vPz+3Pz6pPzGdPz+7Py+ZPz+/PzCdPz+xPz+5Pz6rP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAV+YCQyjGie5KmmpjAkzSCohAFBBrE+z/GUggRgCGjMRAREIKBE6JCHqJQxGC4A14HJwOwiDKaeNPooYM+LRSnSXDZH47H5Sm+sm20EPB6tXq1aIlxuS2AiYmMPAg10C0YmSV4ICiYMfEAvMUcmCgYIXw87ZGsjpCoRDE+nqKQhACH5BAgDAAAALAAAAAAeAAoAg/zahPz+3PzqrPz+/PzijPz67PzejPz+5P///wAAAAAAAAAAAAAAAAAAAAAAAAAAAARfEMkxpL306myLIIRQaB4obscRHFVhADBgjNLxxrM1BHw/CLGYwAIMAoa1Xs9mlFUQTdhEqbwZn1bclMorBpEIr9Cioh5cRhqi0FTvqC2BwXC6eOZ1XZmFeWomfn8cCBEAIfkECAMAAAAsAAAAAB4ACgCE/Lpk/Pak/Pbk/NaU/MJs/P68/P70/Pqk/P7c/MZ0/L5k/MJ0/P7E/P78/Pqs/P7k////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABX0gJDaNaJ7kqaamUThOYajCkCyDsD4P8pSGwyFAPMxEgoUCsFzoRoiotFEIDIWBgmkA6DIBg5ZU+rhaiyUIgblcEqBjKfYqTBPa3zekEZdWzVlbXl5hIgZ9D0FnQkcQAncKkU5icUAFQgUPNAMLOE8mDT0+jRAGpCtpKiOpIQAh+QQIAwAAACwAAAAAHgAKAIP8nkT8/rz88uT8woT8plT8/tT8/uT8/vT8nkz8/sT8qlz8/tz8/vz///8AAAAAAAAEdbBJxqS99OpsT0lJcWjCoCiDsBnLYlRHEsxBMkqCAuyIokqHlnDBKNBoBcuAtwMMLKyhS1ajJSoNAgCx5RImUiF1JrtKtNz0t8EIt4zVWVKy3DafkujQEDvaLAIEaT0/bGEwHyE3gCYohUBRLxhYGkCLlRwNEQAh+QQIAwAAACwAAAAAHgAKAIPsgiz87tz8rmz0jjz8/tz8/vz0ijT8rnT0kjz8/uT///8AAAAAAAAAAAAAAAAAAAAEWVDJUqS99OpsS0pEUl3BgSBHsIFhVRBwPCrBANzAoE6xzPYJiwCHE1h+MWTPZSDeDK6edEpgOgFQxYuqDAmvRklXNJ3ViLpOWcsSaQKCk2DXac+0900eM4sAACH5BAgDAAAALAAAAAAeAAoAg/yeRPz+vPzy5PzChPymVPz+1Pz+5Pz+9PyeTPz+xPyqXPz+3Pz+/P///wAAAAAAAAR2sEnGpL306myZMYtRXcKgKIOgHUWSFEfDLHQ9NoICAAigqJJDIkAMJA6gGs1gGex6u4GlUCwWlMoRgcfrESZVoxFrk2yh3slwWEwklUyJk8uTSqhiYmGGvQkIPQgIPxZCRGsxHks3EiUnKRogLjAYjCsxGh03EQAh+QQIAwAAACwAAAAAHgAKAIT8umT89qT89uT81pT8wmz8/rz8/vT8+qT8/tz8xnT8vmT8wnT8/sT8/vz8+qz8/uT///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFfyAkNo1onuSppmbzPMhTnsKQLIOgGoXjFAZIA0EsziCChQKwXOhEhsMhQD0YYEXiwzQAeJmAgakQmEoDhWx2RmAul4SRo1wtq40iwhscF5rpUgZ3WyJdX15iImR/aIJqR0kKkgpOJlF1B1suWkciNQs4T5YFUgWEI50rqShBIiEAIfkECAMAAAAsAAAAAB4ACgCD/NqE/P7c/Oqs/P78/OKM/Prs/N6M/P7k////AAAAAAAAAAAAAAAAAAAAAAAAAAAABGEQyTGkvfTqbMc5wVFdhUAQQqGVZ4oMQSyPyGEAOGCokp3rBZAsdrAIfjiBEQkQDIejG3PCxD1nEunPMNH+hMOi5IhUjpkC2JNW8AJ4iAJT5SHSJCWDwUUS6PkTdxuCGDQRACH5BAgDAAAALAAAAAAeAAoAhPy6ZPz2pPz25PzWlPz+9PzCbPz+vPz+3Pz6pPzGdPz+7Py+ZPz+/PzCdPz+xPz+5Pz6rP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAV9YCQyjGie5KmmJvM8x1OeigNBBqEKQ9IMggjjQCzOIgpIIIBg6kSCBGABADQUsCLxYXI0vwGDaVCdVgda7QzMZI6oCzigkDaKvmDEqGCGFxR1XCIGS21hY2ZlAwR1RwoIeQomAg1yDUEuW0ciCgaQBoKTPT+SLZsrTyojRyEAIfkECAMAAAAsAAAAAB4ACgCD/J5E/P68/PLk/MKE/KZU/P7U/P7k/KpU/P70/J5M/P7E/P7c/Kpc/P78////AAAABHbQydakvfTqbJsxi1FdSKEoBaIJA3MMgtMsdD06iBLsgaJKgkMCMGQIQDWawVLg8QqWAYBIHSSTI11vq5gQqEMA4WqTaJ1d2XfIPiCTS0lzu4NKpOHhYHa95XY6PhZBREMHMR5KNxIlJykrAwcMMBiLG5YYPw4RACH5BAgDAAAALAAAAAAeAAoAg+yCLPzu3PyubPSOPPz+3PSKNPz+/PyudPSSPPz+5PSKPP///wAAAAAAAAAAAAAAAARdcEljpL306mxNSkRSYV84WsGBIEewGEQsn7Acn8EA7MAQgLaQBWhLWAQ8niA4kzBjE10SUHgSRtZJYUolyowSbwy8OHAFNRuNiZPufC+gaCM/SQKClcDVsW/8GCcRACH5BAgDAAAALAAAAAAeAAoAg/yeRPzy5PzChPymVPz+3PyqVPz+/PyeTPz+5PyqXP///wAAAAAAAAAAAAAAAAAAAARhUEljpL306mwNQgRSYV84WoGQFEKgGEQsn7Acn0EBHAeQBCBbyBK0ISyCHUApEM4kzthkoOwBBlHCKDut7gpF2VESjo0VyZ5VULPRnLiC2ufymE+ToEiTKiRaGHgbgoEWEQAh+QQIAwAAACwAAAAAHgAKAIP8umT89uT81pT8wmz8/vz8/tz8xnT8vmT8wnT8/uT///8AAAAAAAAAAAAAAAAAAAAEX1BJQqS99OpsSUpFUmFfOFqBYCBCoBBFLJ+wHJ+BARwAgAQgW8gStCUsgt5uJxDOJM7YZLDjVaOFEXa6PPAQRdlREo6NFUkrs2ajOXEI3tflMZ8mQZEmtWph7huAfxYRACH5BAgDAAAALAAAAAAeAAoAg/zahPz+3PzqrPz+/PzijPz67PzejPz+5P///wAAAAAAAAAAAAAAAAAAAAAAAAAAAARbEMkxpL306mzHOcFRYV84WoVAEEKBDEEsn7Acn4cB7IBRgLaQBWg7WAQ8niA4kzBjE11y9wyMqtHpjigzSrgxLwI5FdRsNOapIOW5POHTBCjSpAyGFka+4e8tEQAh+QQIAwAAACwAAAAAHgAKAIP89qT8/tz8/rz8/vT8+qT8/uT8/sT8/vz8+qz///8AAAAAAAAAAAAAAAAAAAAAAAAEXDDJc6S99OpsTylBUWFfOFqDgCDCkBxBLJ+DPKMEAezEANohFDAoEQB0OYBgGBsxAxMk7/h0MieIozZXAxaEXotRquzaaEOabvv1xEQa39t1SeUE385J89pv6AkRACH5BAgDAAAALAAAAAAeAAoAgvz+vPz+5Pz+1Pz+9Pz+xPz+3Pz+/P///wNZeGqm/uzJ6EwIJTR483aDQBDCcBhFqn6DuoIEIAPEgLmZc7uBI8wzAe512LkWMZqSMExtmgUkUEYwpnoKa07xS8YEKNwn7GJ5aSbL9bO4aSShUQnCntTpjgQAOw=="/>',
            '', panel, style);

          if(request.action == 'getOdklLinks')
          {
            video.getOdklLinks(panel.id, request);
          }
          else
          {
            chrome.extension.sendRequest(request, function(response){
              showVideoLinks(panel.id, response);
            });
          }
        }

        return false;
      }, false);
    },


    show: function(links, title, parent, style, action)
    {
      if(!parent)
        return;

      SaveFrom_Utils.emptyNode(parent);

      if(!links || links.length == 0)
      {
        parent.appendChild(document.createTextNode(chrome.i18n.getMessage('noLinksFound')));
        return;
      }

      if(action == 'getYoutubeLinks')
      {
        SaveFrom_Utils.video.yt.init(prefs);
        SaveFrom_Utils.video.yt.show(links, parent, prefs.moduleShowDownloadInfo, {
          link: {color: '#eb722e', 'line-height': 'normal'},
          text: null,
          btn: {color: '#777', borderColor: '#555', fontSize: '95%'},
          fsIcon: {opacity: '.5'},
          fsText: {fontSize: '80%', 'line-height': 'normal'}
        }, title);

        return;
      }

      if(title)
        title = SaveFrom_Utils.trim(title.replace(/\x2B+/g, ' '));

      var html = false;
      if(typeof(links) == 'string')
        html = true;
      else if(links.length == 0)
        return;

      SaveFrom_Utils.setStyle(parent, {
        color: '#555',
        display: 'block',
        float: 'none',
        fontSize: '11pt',
        fontWeight: 'bold',
        margin: '15px 0',
        padding: '0',
        textAlign: 'center'
      });

      if(style && typeof(style) == 'object')
        SaveFrom_Utils.setStyle(parent, style);

      if(html)
      {
        parent.innerHTML = links;
        return;
      }

      parent.appendChild(document.createTextNode(chrome.i18n.getMessage('download') + ':'));

      var color = '';
      for(var i = 0; i < links.length; i++)
      {
        var a = null;

        if(typeof(links[i]) == 'object' && links[i].url)
        {
          var ext = links[i].ext;
          if(!ext)
          {
            ext = 'FLV';
            if(links[i].url.search(/\.mp4$/i) != -1)
              ext = 'MP4';
          }

          var name = links[i].name ? links[i].name : ext;
          a = createTextLink(links[i].url, name);

          if(title && !links[i].noTitle)
          {
            a.setAttribute('download', SaveFrom_Utils.fileName.modify(
              title + '.' + ext.toLowerCase()));

            a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
          }

          if(links[i].subname)
          {
            var st = document.createElement('span');
            SaveFrom_Utils.setStyle(st, {
              fontSize: '80%',
              fontWeight: 'normal',
              marginLeft: '3px'
            });
            st.innerText = links[i].subname;
            a.appendChild(st);
          }
        }
        else
        {
          var ext = 'FLV';
          if(links[i].search(/\.mp4$/i) != -1)
            ext = 'MP4';

          var name = ext;
          q = SaveFrom_Utils.getMatchFirst(links[i], /\.(\d+)\.mp4/i);
          if(q)
            name += ' (' + q + ')';

          a = createTextLink(links[i], name);

          if(title)
          {
            a.setAttribute('download', SaveFrom_Utils.fileName.modify(
              title + '.' + ext.toLowerCase()));

            a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
          }
        }

        if(a)
        {
          a.style.marginLeft = '10px';
          a.style.lineHeight = 'normal';
          a.title = chrome.i18n.getMessage('downloadTitle');
          parent.appendChild(a);

          SaveFrom_Utils.appendFileSizeIcon(a,
            {opacity: '.5'},
            {fontSize: '80%', opacity: '.9', 'line-height': 'normal'});

          if(!color)
            color = SaveFrom_Utils.getStyle(a, 'color');
        }
      }

      if(prefs.moduleShowDownloadInfo == '1')
      {
        if(!color)
          color = '#a0a0a0';

        parent.appendChild(document.createElement('br'));
        SaveFrom_Utils.appendDownloadInfo(parent, color);
      }
    },


    showExternalLinks: function(vid, action, title, parent, parentClass)
    {
      video.appendButton('', '', video.style, {
        action: action,
        extVideoId: vid,
        title: title
      }, parent, parentClass);
    },

    getMetadata: function(url, cb) {
      if (!url) {
        return;
      }
      SaveFrom_Utils.sendRequest(url, function(r) {
        if (r.status !== 200) {
          return;
        }
        try {
          var data = JSON.parse(r.responseText);
          return cb(data);
        } catch (e) {}
      });
    },

    appendVideoLink: function(provider, vid, metadata, parent) {
      if(!provider || !vid) {
        return;
      }
      var action = undefined;
      switch(provider)
      {
        case 'user_youtube':
          if(!prefs.lite)
          {
            action = 'getYoutubeLinks';
          }
          break;

        case 'open_graph':
          vid = SaveFrom_Utils.getMatchFirst(vid, /clip_id=(\w+)/i);
          action = 'getVimeoLinks';
          break;

        case 'uploaded':
          action = 'getOdnoklassnikiLinks';
          break;

        case 'uploaded_odkl':
          if(metadata.movie && metadata.movie.movieId)
          {
            vid = metadata.movie.movieId;
            action = 'getOdklLinks';
          }
          break;
      }

      if(action !== undefined)
      {
        video.showExternalLinks(vid, action, '', parent);
      }
    },

    showLinks: function()
    {
      window.clearInterval(video.titleTimer);

      var node = document.querySelectorAll('*[' + video.parentDataAttr + '="1"]');
      if(node && node.length > 0)
      {
        for(var i = 0; i < node.length; i++)
          node[i].removeAttribute(video.parentDataAttr);
      }

      node = null;

      var parent = SaveFrom_Utils.getElementByIds(['vp_w', 'videoPlayerPanel']);
      if(parent && !parent.getAttribute(video.parentDataAttr))
      {
        node = parent.querySelectorAll('param[name="flashvars"]');

        for(var i = 0; i < node.length; i++)
        {
          var vid = undefined, metadata = undefined,
            provider = SaveFrom_Utils.getMatchFirst(node[i].value, /providerId=(\w+)/);

          if(provider)
          {
            provider = provider.toLowerCase();
            var vid = SaveFrom_Utils.getMatchFirst(node[i].value, /movieId=([\w\-]+)/);
          }
          else
          {
            var md = SaveFrom_Utils.getMatchFirst(node[i].value, /metadata=([^&\s]+)/);
            if(md)
            {
              md = decodeURIComponent(md);
              md = JSON.parse(md);
              if(md)
              {
                metadata = md;
                if(md.provider && md.movie && md.movie.contentId)
                {
                  provider = md.provider.toLowerCase();
                  vid = md.movie.contentId;
                }
              }
            }
            md = SaveFrom_Utils.getMatchFirst(node[i].value, /metadataUrl=([^&\s]+)/);
            if(md) {
              this.getMetadata(decodeURIComponent(md), function(data) {
                if (data === undefined || data.provider === undefined || data.movie === undefined) {
                  return;
                }
                video.appendVideoLink(data.provider.toLowerCase(), data.movie.contentId, data, parent);
              });
            }
          }
          this.appendVideoLink(provider, vid, metadata, parent);
        }
      }

      var result = false;

      for(var i in video.inline)
      {
        var node = document.querySelectorAll('.' + i + ' ' +
          video.inline[i].selector);

        for(var j = 0; j < node.length; j++)
        {
          video.handleInlineVideo(node[j], null, i);
        }
      }

      video.catchPopupLinks();

      return result;
    },


    handleInlineVideo: function(node, parent, parentClass)
    {
      var src = node.src;
      if(!src)
        return;

      var msg = '';

      for(var k in video.reImg)
      {
        var vid = SaveFrom_Utils.getMatchFirst(src, video.reImg[k]);
        if(vid)
        {
          var title = node.alt;

          if(!parent)
            parent = SaveFrom_Utils.getParentByClass(node, parentClass);

          if (!parent) {
            continue;
          }

          if(k == 'getOdklLinks')
          {
            var mid = video.findMetaDataId(parent);
            if(mid)
              vid = mid;
          }
          else if(k == 'getVimeoLinks')
          {
            var vid = video.findMetaDataId(parent, /clip_id=(\w+)/i);
          }
          else if (k === 'getDailymotionLinks')
          {
            vid = video.findMetaDataId(parent, /dailymotion\.com\/swf\/video\/(\w+)\??/i);
          }

          if(vid)
            video.showExternalLinks(vid, k, title, parent, parentClass);
          break;
        }
      }
    },


    findMetaDataId: function(parent, regexp)
    {
      var info = '', keyRe = /videoPlayerMetadata|metadata/i;

      var node = parent.querySelectorAll('div[data-query],span[data-query]');
      if(node && node.length > 0)
      {
        for(var i = 0; i < node.length; i++)
        {
          var q = node[i].getAttribute('data-query');
          if(q.search(keyRe) > -1)
          {
            info = q;
            break;
          }
        }
      }

      if(!info)
      {
        node = parent.querySelectorAll('div[onclick],span[onclick]');
        for(var i = 0; i < node.length; i++)
        {
          var q = node[i].getAttribute('onclick');
          if(q.search(keyRe) > -1)
          {
            info = q;
            break;
          }
        }
      }

      if(!info)
        return '';

      info = SaveFrom_Utils.decodeHTML(info);
      info = decodeURIComponent(info);
      return SaveFrom_Utils.getMatchFirst(info, regexp || /(?:\?|&)mid=(\d+)/i);
    },


    catchPopupLinks: function()
    {
      document.removeEventListener('mousedown', video.onVideoClick, false);
      document.addEventListener('mousedown', video.onVideoClick, false);

      document.removeEventListener('mouseover', video.onVideoHover, false);
      document.addEventListener('mouseover', video.onVideoHover, false);

      var loc = document.location.href;
      video.titleTimer = window.setInterval(function(){
        if(document.location.href != loc)
        {
          loc = document.location.href;
          window.clearInterval(video.titleTimer);
          video.showLinks();
        }
      }, 3000);
    },


    onVideoClick: function(event)
    {
      var node = event.target;
      if(node.tagName != 'A')
      {
        for(var parent = node; parent; parent = parent.parentNode)
        {
          if(parent.tagName == 'A')
          {
            node = parent;
            break;
          }
        }
      }

      if(node.tagName != 'A')
        return;

      if(node.href && node.href.search(/((?:\?|&)cmd=PopLayerMovie|\/video\/\d+)/i) > -1)
      {
        setTimeout(function(){
          var node = SaveFrom_Utils.getElementByIds(['VideoPopup_player', 'videoPlayerPanel']);
          if(node)
            video.catchPopup();
        }, 1000);

        return;
      }

      if(node.getAttribute('hrefattrs'))
      {
        setTimeout(function(){
          video.catchPopup();
        }, 1000);

        return;
      }
    },


    catchPopup: function(event)
    {
      clearTimeout(video.popupTimer);
      video.popupTimer = setTimeout(function(){
        clearTimeout(video.popupTimer);
        video.showLinks();
      }, 2000);
    },


    onVideoHover: function(event)
    {
      var node = event.target;
      if(node.tagName = 'IMG' && node.src)
      {
        for(var i in video.inline)
        {
          if(SaveFrom_Utils.matchesSelector(node, video.inline[i].selector))
          {
            video.handleInlineVideo(node, null, i);
            return;
          }
        }
      }
    },


    getOdklLinks: function(parentId, request)
    {
      var url = '/dk?cmd=videoPlayerMetadata&mid=' + request.extVideoId +
        '&rnd=' + (new Date()).getTime() + Math.random();

      var response = request;

      SaveFrom_Utils.sendRequest(url, function(r){
        if(r.status == 200 && r.responseText)
        {
          try
          {
            var md = JSON.parse(r.responseText);
            if(md && md.videos && md.videos.length > 0)
            {
              if (md.provider === 'USER_YOUTUBE') {
                var v = md.videos[0].url;
                var vId = v.substr(v.lastIndexOf('/')+1);
                var request = {
                  action: 'getYoutubeLinks',
                  extVideoId: vId
                };
                chrome.extension.sendRequest(request, function(response){
                  showVideoLinks(parentId, response);
                });
                return;
              }
              var links = [];
              for(var i = 0; i < md.videos.length; i++)
              {
                var v = md.videos[i];
                if(v.url && v.url.search(/^https?:\/\//i) > -1)
                {
                  links.push({
                    url: v.url,
                    subname: v.name ? v.name : '',
                    ext: 'MP4'
                  });
                }
              }

              if (md.movie !== undefined && md.movie.title) {
                response.title = md.movie.title;
              }
              if(links)
              {
                response.links = links;
              }
            }
          }
          catch(err){}
        }

        showVideoLinks(parentId, response);
      }, '', url);
    }
  };

  //  /VIDEO
  ///////////////////////////////////////////////////////////////////


  var odnoklassniki = {
    run: function()
    {
      audio.showLinks();
      video.showLinks();
      video.catchPopup();
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('odnoklassniki', response);
    if (response.moduleEnable)
    {
      prefs = response;
      SaveFrom_Utils.runModule(response, odnoklassniki);
    }
  });
};

_modules.savefrom = function(){
  if(window.top != window.self)
    return;

  if(window.location.href.search(/savefrom\.net\/(index\.php|user\.php|\d+-[^\/]+\/|articles\/.+)?(\?|#|$)/i) == -1)
    return;

  window.savefrom__lm = {};

  var moduleName = 'savefrom',
      prefs = {};

  var savefrom = {
    name: moduleName,
    scriptId: 'savefrom__ext_script',
    dataAttr: 'data-extension-disabled',


    run: function()
    {
      savefrom.setExtParams();
      if(!prefs.moduleEnable)
        return;

      var form = document.getElementById('sf_form');
      if(!form)
        return;

      form.addEventListener('submit', function(event){
        var url = form.sf_url.value;
        if(!url)
          return;

        if(form.getAttribute(savefrom.dataAttr) == '1')
          return;

        var re = {
          getVKLinks: [
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/(video-?\d+_-?\d+)/i,
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/video_ext.php\?(.*oid=-?\d+.*)$/i,
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/[\w\-]+\?.*z=(video-?\d+_-?\d+)/i
          ],

          getYoutubeLinks: [
            /^https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?.*v=([\w\-]+)/i,
            /^https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
            /^https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i
          ],

          getVimeoLinks: [
            /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(?:\w+\#)?(\d+)/i,
            /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i
          ],

          getDailymotionLinks: [
            /^http:\/\/dai\.ly\/([a-z0-9]+)_?/i,
            /^https?:\/\/(?:[\w]+\.)?dailymotion\.com(?:\/embed)?\/video\/([a-z0-9]+)_?/i
          ]
        };

        for(var i in re)
        {
          for(var j = 0; j < re[i].length; j++)
          {
            var vid = url.match(re[i][j]);
            if(vid && vid.length > 1)
            {
              vid = vid[1];
              var playlist = SaveFrom_Utils.getMatchFirst(url, /list=([\w\-]+)/i);
              event.preventDefault();
              event.stopPropagation();

              var request = {
                extVideoId: vid,
                action: i,
                checkSubtitles: true,
                checkLinks: true
              };

              chrome.extension.sendRequest(request, function(r){
                savefrom.setLinks(r.action, r.extVideoId, r.links, r.title, null,
                  r.subtitles, playlist, r.duration, r.thumb, r.checkLinks);
              });

              return false;
            }
          }
        }
      }, false);


      document.body.addEventListener('click', function(event){
        var node = event.target;
        if(node.tagName != 'A')
        {
          if(node.parentNode.tagName == 'A')
            node = node.parentNode;
          else
            return;
        }

        var vid = node.getAttribute('data-video-id');
        if(!vid)
          return;

        if(node.getAttribute(savefrom.dataAttr) == '1')
          return;

        var action = {vk: 'getVKLinks', yt: 'getYoutubeLinks'};

        vid = vid.split(':', 2);
        if(vid.length != 2 || !action[vid[0]])
          return;

        event.preventDefault();
        event.stopPropagation();

        node.style.display = 'none';

        if(!node.id)
        {
          node.id = vid[0] + '_' + vid[1] + '_' + (Math.random() * 1000) +
            '_' + (new Date()).getTime();
        }

        var request = {
          extVideoId: vid[1],
          action: action[vid[0]],
          checkSubtitles: true,
          checkLinks: true
        };

        chrome.extension.sendRequest(request, function(r){
          savefrom.setLinks(r.action, r.extVideoId, r.links, r.title, node,
            r.subtitles, null, r.duration, r.thumb, r.checkLinks);
        });

        return false;
      }, true);
    },


    setExtParams: function()
    {
      var s = document.createElement('script');
      s.id = 'savefrom__ext_params';
      s.type = 'text/javascript';

      var params = {
        id: prefs.lite ? 'chromelite' : 'chrome',
        version: prefs.version,
        userjs: true,
        enable: prefs.moduleEnable
      };

      s.text = 'try{' +
        'if(window.setBrowserExtension && typeof setBrowserExtension == "function"){' +
        'setBrowserExtension(' + JSON.stringify(params) + ');}' +
        '}catch(err){}';

      document.body.appendChild(s);
    },


    setLinks: function(action, vid, links, title, btn, subtitles, playlist,
      duration, thumb, valid)
    {
      if(valid === false)
      {
        savefrom.handleError(btn);
        return;
      }

      switch(action)
      {
        case 'getYoutubeLinks':
          savefrom.setYoutubeLinks(vid, links, title, btn, subtitles,
            playlist, duration, thumb);
          break;

        case 'getVKLinks':
          savefrom.setVKLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getVimeoLinks':
          savefrom.setVimeoLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getDailymotionLinks':
          savefrom.setDailymotionLinks(vid, links, title, btn, duration, thumb);
          break;
      }
    },


    handleError: function(btn)
    {
      if(btn)
      {
        if(btn)
        {
          btn.style.display = '';
          btn.setAttribute(savefrom.dataAttr, '1');
          btn.click();
        }
        return;
      }

      var form = document.getElementById('sf_form');
      if(!form)
        return;

      form.setAttribute(savefrom.dataAttr, '1');
      form.submit();
      form.removeAttribute(savefrom.dataAttr);
    },


    showVideoResult: function(result, btn)
    {
      if(!result || !result.url || !result.url.length)
      {
        savefrom.handleError(btn);
        return;
      }

      var s = document.getElementById(savefrom.scriptId);
      if(s)
        s.parentNode.removeChild(s);

      s = document.createElement('script');
      s.id = savefrom.scriptId;
      s.type = 'text/javascript';

      if(btn)
      {
        s.text = 'try{' +
          'var btn = document.getElementById("' + btn.id + '");' +
          'sf.result.replaceAjaxResult(' + JSON.stringify(result) + ', true, true, btn);' +
          '}catch(err){}';
      }
      else
      {
        s.text = 'try{' +
          'sf.finishRequest(true);' +
          'sf.videoResult.show(' + JSON.stringify(result) + ');' +
          '}catch(err){}';
      }

      document.body.appendChild(s);
    },


    setVKLinks: function(vid, links, title, btn, duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        url: links,
        meta: {
          title: (title ? SaveFrom_Utils.fileName.modify(title) : ''),
          source: "http://vk.com/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      for(var i = 0; i < result.url.length; i++)
      {
        result.url[i].info_url = '';

        if(!result.url[i].ext && result.url[i].type)
          result.url[i].ext = result.url[i].type;

        if(!result.sd && !result.url[i].subname)
          result.sd = {url: result.url[i].url};
        else if(!result.hd && result.url[i].subname && parseInt(result.url[i].subname) >= 720)
          result.hd = {url: result.url[i].url};
      }

      savefrom.showVideoResult(result, btn);
    },


    setYoutubeLinks: function(vid, links, title, btn, subtitles, playlist,
      duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        url: [],
        meta: {
          title: (title ? SaveFrom_Utils.fileName.modify(title) : ''),
          source: (vid ? 'http://youtube.com/watch?v=' + vid : ''),
          duration: SaveFrom_Utils.secondsToDuration(duration)
        },
        thumb: (vid ? 'http://i.ytimg.com/vi/' + vid + '/hqdefault.jpg' : '')
      };

      var sig = false;

      SaveFrom_Utils.video.yt.filterLinks(links);

      for(var i in SaveFrom_Utils.video.yt.format)
      {
        var f = SaveFrom_Utils.video.yt.format[i];
        for(var j in f)
        {
          if(links[j])
          {
            if(!sig && links[j].search(/(\?|&)sig(nature)?=/i) > -1)
              sig = true;

            var l = {
              url: links[j],
              name: i,
              subname: f[j].quality + ( (i === 'Audio MP4' || i === 'Audio OGG')? ' '+chrome.i18n.getMessage('kbps') : '' ),
              info_url: '',
              type: i,
              quality: f[j].quality,
              attr: {}
            };

            if(f[j]['3d'])
            {
              l.name = '3D ' + l.name;
              l.group = '3d';
              l['3d'] = true;
            }
            else if(f[j]['noAudio'])
            {
              l.group = 'MP4 ';
              l.attr['class'] = 'no-audio';
              l.ext = 'mp4';
            }
            else if(i == 'Audio MP4')
            {
              l.type = 'AAC';
              l.ext = 'aac';
              l.attr.style = 'white-space: nowrap;';
            }
            else
            {
              if(i.toLowerCase() == 'flv' && !result.sd)
              {
                result.sd = {url: links[j]};
              }

              if(parseInt(f[j].quality) >= 720 && result.sd && !result.hd)
              {
                result.hd = {url: links[j]};
              }
            }

            result.url.push(l);
            delete links[j];
          }
        }
      }

      if(!sig)
      {
        savefrom.handleError(btn);
        return;
      }

      if(subtitles)
      {
        var subsId = vid.replace(/[^\w]/, '_');
        var btnId = 'yt_subs_btn_' + subsId;
        subsId = 'yt_subs_' + subsId;

        var subtToken = 'extension';
        var subsTitle = result.meta.title ?
          SaveFrom_Utils.base64_encode(SaveFrom_Utils.utf8Encode(result.meta.title)) : '';

        result.action = [];
        result.action.push({
          name: chrome.i18n.getMessage('subtitles'),
          attr: {
            id: btnId,
            href: '#',
          },

          bind: {
            click: {
              fn: "sf.youtubeSubtitles('" + vid + "','" + subsId + "'" +
                ",'#" + btnId + "','" + subtToken + "','" + subsTitle + "');"
            }
          }
        });
      }

      if(playlist)
      {
        playlist = 'http://www.youtube.com/playlist?list=' + playlist;

        if(!result.action)
          result.action = [];

        result.action.push({
          name: chrome.i18n.getMessage('playlist'),
          attr: {
            href: '#',
            class: 'tooltip',
            title: chrome.i18n.getMessage('downloadWholePlaylist'),
          },

          bind: {
            click: {
              fn: "sf.processLink('" + playlist + "');"
            }
          }
        });
      }

      savefrom.showVideoResult(result, btn);
    },

    setVimeoLinks: function(vid, links, title, btn, duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        url: links,
        meta: {
          title: (title ? SaveFrom_Utils.fileName.modify(title) : ''),
          source: "http://vimeo.com/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      for(var i = 0; i < result.url.length; i++)
      {
        result.url[i].info_url = '';

        if(!result.url[i].ext && result.url[i].type)
          result.url[i].ext = result.url[i].type;

        if(!result.sd && result.url[i].name == 'SD')
          result.sd = {url: result.url[i].url};
        else if(!result.hd && result.url[i].name == 'HD')
          result.hd = {url: result.url[i].url};
      }

      savefrom.showVideoResult(result, btn);
    },

    setDailymotionLinks: function(vid, links, title, btn, duration, thumb) {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        url: links,
        meta: {
          title: (title ? SaveFrom_Utils.fileName.modify(title) : ''),
          source: "http://dai.ly/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      var hd_size = 0, sd_size = 0;
      for (var i = 0, item; item = links[i]; i++) {
        if (item.height >= 720) {
          if (hd_size < item.height) {
            result.hd = {url: item.url};
            hd_size = item.height;
          }
        } else
        if (sd_size < item.height) {
          result.sd = {url: item.url};
          sd_size = item.height;
        }
        delete item.height;
      }
      savefrom.showVideoResult(result, btn);
    }
  }


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('savefrom', response);
    prefs = response;
    SaveFrom_Utils.runModule(response, savefrom);
  });
};

_modules.soundcloud = function(){
  if(window.top != window.self)
    return;

  window.savefrom__lm = {};

  var moduleName = 'soundcloud',
      prefs = {};

  var sc = {
    client_id: 'b45b1aa10f1ac2941910a7f0d10f8e28',

    lastRow: null,
    lastRowCandidate: null,
    timer: 0,
    timeout: 10000,
    rowAttr: 'data-savefrom-helper',
    btnClass: 'savefrom-helper--btn',

    tracks: {},


    run: function(){
      document.removeEventListener('mouseover', sc.onMouseOver, true);
      document.removeEventListener('mouseout', sc.onMouseOut, true);

      document.addEventListener('mouseover', sc.onMouseOver, true);
      document.addEventListener('mouseout', sc.onMouseOut, true);

      sc.handleSingleTrack();
    },


    getTime: function()
    {
      return (new Date()).getTime();
    },


    checkRow: function(row)
    {
      var attr = row.getAttribute(sc.rowAttr);
      if(attr)
      {
        attr = parseInt(attr);
        if(!isNaN(attr) && (sc.getTime() - attr) <= sc.timeout)
          return false;
      }

      if(row.querySelector('.' + sc.btnClass))
        return false;

      return true;
    },



    onMouseOver: function(event)
    {
      var row = SaveFrom_Utils.getParentByClass(event.target,
        ['soundList__item', 'searchList__item', 'trackList__item', 'soundBadgeList__item', 'sound']);

      if(!row || !sc.checkRow(row))
        return;

      sc.lastRowCandidate = row;
      clearTimeout(sc.timer);

      if(sc.lastRow == row)
        return;

      sc.timer = setTimeout(function(){
        sc.lastRow = row;
        sc.lastRowCandidate = null;
        sc.handleRow(sc.lastRow);
      }, 1000);
    },


    onMouseOut: function(event)
    {
      if(!sc.lastRow && !sc.lastRowCandidate)
        return;

      var node = event.target;
      if(!SaveFrom_Utils.isParent(node, sc.lastRow) &&
        !SaveFrom_Utils.isParent(node, sc.lastRowCandidate))
      {
        clearTimeout(sc.timer);
      }
    },


    handleSingleTrack: function()
    {
      var count = 0;

      var timer = setInterval(function(){
        count++;
        var row = document.querySelector('.sound.single');
        if(row || count > 10)
        {
          clearInterval(timer);
          sc.handleRow(row);
        }
      }, 1000);
    },


    handleRow: function(row)
    {
      if(!row)
        return;

      row.setAttribute(sc.rowAttr, sc.getTime());

      setTimeout(function(){
        row.removeAttribute(sc.rowAttr);
      }, sc.timeout);

      var a = row.querySelector('a.sound__coverArt[href], a.soundTitle__title[href]');
      if(a)
      {
        sc.getTrackInfo(a.href, row);
        return;
      }

      if(SaveFrom_Utils.hasClass(row, 'single'))
        sc.getTrackInfo(window.location.href, row);
    },


    getTrackInfo: function(url, row)
    {
      url = url.replace(/#.*$/i, '');

      if(url.search(/^\/\/(?:[\w-]+\.)?soundcloud\.com(?:\d+)?\//i) > -1)
      {
        url = window.location.protocol + url;
      }
      else if(url.search(/https?:\/\//i) == -1)
      {
        if(url.charAt(0) != '/')
          url = '/' + url;

        url = window.location.protocol + '//' + window.location.host + url;
      }

      if(sc.tracks[url])
      {
        sc.tracks[url].row = row;
        if(sc.tracks[url].url || sc.tracks[url].playlist)
        {
          sc.appendButton(url);
        }
        return;
      }

      sc.tracks[url] = {row: row};

      var request = {
        action: 'getSoundcloudTrackInfo',
        trackUrl: url,
        client_id: sc.client_id
      };

      chrome.extension.sendRequest(request, function(response){
        sc.setTrackInfo(response);
      });
    },


    removeTrackInfo: function(url)
    {
      if(url && sc.tracks[url])
      {
        sc.tracks[url].row.removeAttribute(sc.rowAttr);
        delete sc.tracks[url];
      }
    },


    setTrackInfo: function(data)
    {
      var url = data.trackUrl;
      if(!url || !sc.tracks[url])
        return;

      var info = data.data;
      if(!info)
      {
        sc.removeTrackInfo(url);
        return;
      }

      if(info.kind != 'track' && info.tracks && info.tracks.length == 1)
        info = info.tracks[0];

      if(info.kind == 'track' && info.stream_url)
      {
        sc.setSingleTrackParams(sc.tracks[url], info);
        sc.tracks[url].checkLinks = data.checkLinks;
        sc.appendButton(url);
        return;
      }

      if(info.tracks)
      {
        var playlist = [];
        for(var i = 0; i < info.tracks.length; i++)
        {
          var t = {};
          sc.setSingleTrackParams(t, info.tracks[i]);
          playlist.push(t);
        }

        if(playlist.length > 0)
        {
          if(info.title)
            sc.tracks[url].title = info.title;

          sc.tracks[url].playlist = playlist;
          sc.tracks[url].checkLinks = data.checkLinks;
          sc.appendButton(url);
          return true;
        }
      }

      sc.removeTrackInfo(url);
    },


    setSingleTrackParams: function(track, info)
    {
      var downloadUrl = info.stream_url;
      downloadUrl += (downloadUrl.indexOf('?') == -1) ? '?' : '&';
      downloadUrl += 'client_id=' + sc.client_id;
      track.url = downloadUrl;

      var param = ['id', 'title', 'duration'];
      for(var i = 0; i < param.length; i++)
      {
        if(info[param[i]])
          track[param[i]] = info[param[i]];
      }
    },


    appendButton: function(url)
    {
      if(!url || !sc.tracks[url])
        return;

      var track = sc.tracks[url];

      var parent = track.row.querySelector('.soundActions .sc-button-group');
      if(!parent)
      {
        return;
      }

      var btnClass = ['sc-button-small', 'sc-button-medium', 'sc-button-large'];
      for(var i = 0; i < btnClass.length; i++)
      {
        if(parent.querySelector('.' + btnClass[i]))
          btnClass = [btnClass[i]];
      }

      var a = document.createElement('a');
      a.className = sc.btnClass + ' sc-button sc-button-responsive ' + btnClass[0];
      a.style.position = 'relative';

      var icon = document.createElement('img');

      if(track.playlist)
      {
        a.href = '#';
        a.title = chrome.i18n.getMessage('playlist');

        var title = track.title ? SaveFrom_Utils.fileName.modify(track.title) : 'soundcloud';

        a.addEventListener('click', function(event){
          event.preventDefault();
          setTimeout(function(){
            SaveFrom_Utils.playlist.popupPlaylist(track.playlist, title, true);
          }, 100);
          return false;
        }, false);

        if (track.checkLinks === false) {
          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAJElEQVQoz2P4//8/A7mYgWqa6+vr/xPCtNE86udRP9PWz6RiANU4hUYGNDpOAAAAAElFTkSuQmCC';
        } else {
          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAMUlEQVR42mL8//8/A7mAiYECwILC82Uk7IzN/xmpYjPjqJ9H/UxTP1OkGQAAAP//AwDcahUV6UvyJwAAAABJRU5ErkJggg==';
        }
        icon.alt = chrome.i18n.getMessage('playlist');
      }
      else {
        if (track.checkLinks === false) {
          a.href = '#';
          a.title = chrome.i18n.getMessage('noLinksFound');

          a.addEventListener('click', function(e) {
            e.preventDefault();
            var style = {
              backgroundColor: '#fff',
              border: '1px solid #777',
              padding: '2px 5px 3px'
            };
            SaveFrom_Utils.showTooltip(a,chrome.i18n.getMessage('noLinksFound'), undefined, style);
            return false;
          });

          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAVklEQVQoz2P4//8/A7mYgSqa0UF9ff1/GEaXG0SagYrmI2vAg+djtZkIA+bjdTYeA+YT5WcsBswnNcDmY9NIlGaoAQnYxHEFGMHQxqe5gRDGqpnuGQMALmDKhkjc9oYAAAAASUVORK5CYII=';
          icon.alt = 'noLinksFound'
        } else {
          a.href = track.url;
          a.title = chrome.i18n.getMessage('download');

          if (track.title) {
            a.setAttribute('download',
              SaveFrom_Utils.fileName.modify(SaveFrom_Utils.trim(track.title) + '.mp3'));

            a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
          }

          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAPklEQVR42mNgGHTgvw/DfxgexJqBiuYja8CD55NrwHxyXTCfWP/OJ0sjFgPmkxvXCWRFDy6MT3MDITw40j8Ak46HYQ4gDfUAAAAASUVORK5CYII=';
          icon.alt = 'download';
        }
      }

      SaveFrom_Utils.setStyle(icon, {
        width: '15px',
        height: '15px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        margin: '-7px 0 0 -7px'
      });
      a.appendChild(icon);

      parent.appendChild(a);
      track.row.removeAttribute(sc.rowAttr);
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('soundcloud', response);
    prefs = response;
    SaveFrom_Utils.runModule(response, sc);
  });
};
_modules.vimeo = function(){
  var iframe = false;

  if(window.top != window.self)
  {
    var iframeClipId = location.href.match(/player\.vimeo\.com\/video\/([\w\-]+)/i);

    if(iframeClipId && iframeClipId.length > 1)
      iframe = true;
    else
      return;
  }

  window.savefrom__lm = {};

  var moduleName = 'vimeo',
      prefs = {};

  var vimeo = {
    panelId: 'savefrom__vimeo_links',
    btnBox: null,
    clipId: null,
    timer: null,
    btnPrefix: 'sd_ld_bnt_',
    popupIsShow: false,

    run: function()
    {
      if(!vimeo.clipId) {
        vimeo.clipId = vimeo.getClipId();
      }

      var isList = Array.isArray(vimeo.clipId);

      if(vimeo.clipId) {
        if (iframe && !isList) {
          vimeo.appendIframeButtons();
          return;
        }
        vimeo.showButtonList(vimeo.clipId);
      } else
      if (document.location.href.indexOf('vimeo.com/home') === -1) {
        return;
      } else {
        var count = 5;
        var ajaxWaitTimer = setInterval(function() {
          count--;
          if (count < 0) {
            clearInterval(ajaxWaitTimer);
          }
          vimeo.clipId = vimeo.getClipId();
          if (vimeo.clipId) {
            clearInterval(ajaxWaitTimer);
            vimeo.showButtonList(vimeo.clipId);
          }
        }, 1000);
      }

      if(!iframe) {
        window.clearInterval(vimeo.timer);

        var loc = document.location.href;
        vimeo.timer = window.setInterval(function(){
          if(document.location.href === loc) {
            return;
          }

          loc = document.location.href;

          var clipId = vimeo.getClipId();

          if (!clipId || vimeo.clipId === clipId) {
            clipId = vimeo.getClipIdFromLocation(loc);
          }
          var isList = Array.isArray(clipId);

          if(!clipId || vimeo.clipId === clipId) {
            return;
          }
          vimeo.clipId = clipId;

          if (!isList) {
            vimeo.showButton(vimeo.clipId);
            vimeo.btnExistsChecker(vimeo.clipId);
          } else {
            vimeo.showButtonList(vimeo.clipId);
          }
        }, 1000);
      }
    },

    btnExistsChecker: function(clipId) {
      var n = 10;
      var btnExInterval;
      btnExInterval = setInterval(function(){
        n--;
        if (n < 0 || vimeo.clipId !== clipId) {
          return clearInterval(btnExInterval);
        }
        var btn = document.getElementById(vimeo.btnPrefix+clipId);
        if (btn === null) {
          vimeo.showButton(clipId);
        } else {
          return clearInterval(btnExInterval);
        }
      }, 1000);
    },

    getClipIdFromLocation: function(loc)
    {
      if(!loc)
        loc = document.location.href;

      var id = loc.match(/\/(\d+)$/);

      if(id !== null && id.length > 1) {
        return id[1];
      }

      return null;
    },

    getClipId: function()
    {
      if(iframe && iframeClipId)
        return iframeClipId[1];

      var tags = {
        meta: {attr: 'content', re: /(?:\?|&)clip_id=(\d+)/i},
        embed: {attr: 'flashvars', re: /(?:^|&)clip_id=(\d+)/i},
        object: {attr: 'data', re: /(?:\?|&)clip_id=(\d+)/i},
        param: {attr: 'value', re: /(?:\?|&)clip_id=(\d+)/i}
      };

      var selector = [
        {attr: 'content', sel: 'meta[itemprop="embedUrl"]'},
        {attr: 'href', sel: 'link[rel="canonical"]'}
      ];
      for (var i = 0, item; item = selector[i]; i++) {
        var el = document.querySelector(item.sel);
        if (el === null) {
          continue;
        }
        var url = el.getAttribute(item.attr);
        if (url === null) {
          continue;
        }
        var id = url.match(/\/(?:video\/)(\d+)(?:$|\/)/);
        if (id !== null && id.length > 1) {
          return id[1];
        }
      }

      selector = [
        {attr: 'data-fallback-url', sel: 'div.player_container > div.player[data-fallback-url]'},
        {attr: 'data-clip_id', sel: 'div.player_wrapper > div.faux_player[data-clip_id]'}
      ];
      var linkList = [];
      for (var n = 0, item; item = selector[n]; n++) {
        var elList = document.querySelectorAll(item.sel);
        for (var i = 0, el; el = elList[i]; i++) {
          var type = n;
          var url = el.getAttribute(item.attr);
          if (url === null) {
            continue;
          }
          var container;
          if (type === 1) {
            container = el.parentNode;
            if (container) {
              container = container.parentNode;
            }
            linkList.push({id: url, container: container, type: type});
          } else
          if (type === 0) {
            var id = url.match(/\/(?:video\/)(\d+)(?:$|\/)/);
            if (id !== null && id.length > 1) {
              container = el.parentNode;
              if (container) {
                container = container.parentNode;
              }
              linkList.push({id: id[1], container: container, type: type});
            }
          }
        }
      }
      var linkLen = linkList.length;
      if (linkLen > 0) {
        if (linkLen === 1) {
          return linkList[0].id;
        }
        return linkList;
      }

      return null;
    },

    hidePopup: function(e) {
      if (vimeo.popupIsShow === false) {
        return;
      }
      if (e !== undefined) {
        SaveFrom_Utils.embedDownloader.onBodyClick(e);
      } else {
        SaveFrom_Utils.embedDownloader.hidePanel();
        SaveFrom_Utils.embedDownloader.lastLink = null;
      }
      vimeo.popupIsShow = SaveFrom_Utils.embedDownloader.lastLink !== null;
      if ( vimeo.popupIsShow === false ) {
        document.removeEventListener('click', vimeo.hidePopup, true);
      }
    },

    showButtonList: function(idList) {
      if (!Array.isArray(idList)) {
        return vimeo.showButton(idList);
      }
      for (var i = 0, item; item = idList[i]; i++) {
        var btn_id = vimeo.btnPrefix+item.id;
        if (document.getElementById(btn_id)) {
          continue;
        }
        var btn = document.createElement('a');
        btn.id = btn_id;
        btn.setAttribute('data-savefrom-get-links', document.location.protocol+'//player.vimeo.com/video/' + item.id);
        btn.textContent = chrome.i18n.getMessage('download');
        btn.href = '#';
        if (item.type === 0) {
          var box = item.container.querySelector('#info>p.meta>span.stats');
          if (!box) {
            continue;
          }
          var firstChild = box.firstChild;
          if (firstChild) {
            box.insertBefore(btn, firstChild);
            box.insertBefore(document.createTextNode(' / '), firstChild);
          } else {
            box.appendChild(btn);
          }
        }
        if (item.type === 1) {
          var box = item.container.querySelector('div.info>div.byline>dl dd.by');
          if (!box) {
            continue;
          }
          box.appendChild(btn);
        }
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var id = this.getAttribute('data-id');

          vimeo.popupIsShow = true;
          SaveFrom_Utils.embedDownloader.onClick(e);
          document.removeEventListener('click', vimeo.hidePopup, true);
          document.addEventListener('click', vimeo.hidePopup, true);

        });
      }
    },


    showButton: function(clipId)
    {
      var otherStyle = 0;
      var box = document.querySelector('.video_container_hd');
      if(!box) {
        box = document.getElementById('tools');
        if (box) {
          otherStyle = 1;
        }
      }
      if (!box) {
        // channels
        box = document.querySelector('#info>p.meta>span.stats');
        if (box) {
          otherStyle = 2;
        }
      }
      if (!box) {
        // channel too
        // https://vimeo.com/channels/mbmagazine/92235056
        box = document.querySelector('div.col_small section.block > div.tools') ||
          document.querySelector('div.col_small section.block > div.intro');
        if (box) {
          otherStyle = 3;
        }
      }

      if(!box) {
        return;
      }

      var loadingIcon = 'data:image/gif;base64,R0lGODlhEAAQAPQAAP///6Ghg/v7+7W1ntHRwqOjha6ule/v6t7e1KmpjczMvMbGtPT08djYzOnp4ru7pcDArAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH+GkNyZWF0ZWQgd2l0aCBhamF4bG9hZC5pbmZvACH5BAAKAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAEAAQAAAFUCAgjmRpnqUwFGwhKoRgqq2YFMaRGjWA8AbZiIBbjQQ8AmmFUJEQhQGJhaKOrCksgEla+KIkYvC6SJKQOISoNSYdeIk1ayA8ExTyeR3F749CACH5BAAKAAEALAAAAAAQABAAAAVoICCKR9KMaCoaxeCoqEAkRX3AwMHWxQIIjJSAZWgUEgzBwCBAEQpMwIDwY1FHgwJCtOW2UDWYIDyqNVVkUbYr6CK+o2eUMKgWrqKhj0FrEM8jQQALPFA3MAc8CQSAMA5ZBjgqDQmHIyEAIfkEAAoAAgAsAAAAABAAEAAABWAgII4j85Ao2hRIKgrEUBQJLaSHMe8zgQo6Q8sxS7RIhILhBkgumCTZsXkACBC+0cwF2GoLLoFXREDcDlkAojBICRaFLDCOQtQKjmsQSubtDFU/NXcDBHwkaw1cKQ8MiyEAIfkEAAoAAwAsAAAAABAAEAAABVIgII5kaZ6AIJQCMRTFQKiDQx4GrBfGa4uCnAEhQuRgPwCBtwK+kCNFgjh6QlFYgGO7baJ2CxIioSDpwqNggWCGDVVGphly3BkOpXDrKfNm/4AhACH5BAAKAAQALAAAAAAQABAAAAVgICCOZGmeqEAMRTEQwskYbV0Yx7kYSIzQhtgoBxCKBDQCIOcoLBimRiFhSABYU5gIgW01pLUBYkRItAYAqrlhYiwKjiWAcDMWY8QjsCf4DewiBzQ2N1AmKlgvgCiMjSQhACH5BAAKAAUALAAAAAAQABAAAAVfICCOZGmeqEgUxUAIpkA0AMKyxkEiSZEIsJqhYAg+boUFSTAkiBiNHks3sg1ILAfBiS10gyqCg0UaFBCkwy3RYKiIYMAC+RAxiQgYsJdAjw5DN2gILzEEZgVcKYuMJiEAOwAAAAAAAAAAAA==';

      if (otherStyle === 2 || otherStyle === 3) {
        // channel
        var btn = document.createElement('a');
        btn.id = vimeo.btnPrefix+clipId;
        btn.textContent = chrome.i18n.getMessage('download');
        btn.href = '#';
        if (otherStyle === 3) {
          btn.classList.add('btn');
        }

        btn.addEventListener('click', function(e){
          e.preventDefault();
          var panel = document.getElementById(vimeo.panelId);
          if (panel) {
            var parentNode = panel.parentNode;
            if(parentNode.style.display == 'none')
            {
              SaveFrom_Utils.addClass(btn, 'active');
              parentNode.style.display = 'block';
            }
            else
            {
              SaveFrom_Utils.removeClass(btn, 'active');
              parentNode.style.display = 'none';
            }
            return;
          }

          var panelBox = document.createElement('div');
          var panelBoxStyle = {
            display: 'block',
            'float': 'none',
            margin: '0',
            clear: 'both'
          };
          if (otherStyle === 2) {
            panelBoxStyle.padding = '20px 0 0 0';
          } else
          if (otherStyle === 3) {
            panelBoxStyle.padding = '0 0 5px 0';
          }
          SaveFrom_Utils.setStyle(panelBox, panelBoxStyle);

          panel = document.createElement('div');

          panel.id = vimeo.panelId;
          var panelStyle = {
            display: 'block',
            'float': 'none',
            padding: '5px 10px',
            margin: '0'
          };
          if (otherStyle === 2) {
            panelStyle.border = '1px solid rgba(0, 0, 0, 0.42)';
            panelStyle.backgroundColor = 'rgba(0, 0, 0, 0.32)';
          }
          SaveFrom_Utils.setStyle(panel, panelStyle);
          panelBox.appendChild(panel);

          var img = document.createElement('img');
          img.src = loadingIcon;
          img.alt = '---';
          if (otherStyle === 2) {
            img.setAttribute('style', '' +
              'filter: invert(0.85);' +
              '-webkit-filter: invert(0.85);' +
              '-moz-filter: invert(0.85);' +
              '-o-filter: invert(0.85);' +
              '-ms-filter: invert(0.85);');
          }
          panel.appendChild(img);

          var request = {extVideoId: clipId, action: 'getVimeoLinks'};
          chrome.extension.sendRequest(request, function(response){
            var fsIconStyle;
            if (otherStyle === 2) {
              fsIconStyle = {
                color: '#ffffff',
                opacity: '.7'
              };
            }
            vimeo.showLinks(response.links, response.title, fsIconStyle);
          });

          if (otherStyle === 2) {
            box.parentNode.parentNode.appendChild(panelBox);
          } else
          if (otherStyle === 3) {
            var nextSibling = box.nextSibling;
            if (nextSibling) {
              box.parentNode.insertBefore(panelBox, nextSibling);
            } else {
              box.appendChild(panelBox);
            }
          }
        });

        if (otherStyle === 2) {
          var firstChild = box.firstChild;
          if (firstChild) {
            box.insertBefore(btn, firstChild);
            box.insertBefore(document.createTextNode(' / '), firstChild);
          } else {
            box.appendChild(btn);
          }
        } else
        if (otherStyle === 3) {
          box.appendChild(btn);
        }
        return;
      }

      if(otherStyle === 1)
      {
        var btn = document.createElement('a');
        btn.id = vimeo.btnPrefix+clipId;
        btn.href = 'javascript:void(0)';
        btn.innerHTML = chrome.i18n.getMessage('download');
        btn.className = 'btn iconify_down_b';

        btn.addEventListener('click', function(event){
          var panel = document.getElementById(vimeo.panelId);
          if(!panel)
          {
            SaveFrom_Utils.addClass(btn, 'active');

            var panelBox = document.createElement('div');
            SaveFrom_Utils.setStyle(panelBox, {
              display: 'block',
              'float': 'none',
              padding: '20px 0 0 0',
              margin: '0',
              clear: 'both'
            });
            box.appendChild(panelBox);

            panel = document.createElement('div');
            panel.id = vimeo.panelId;
            SaveFrom_Utils.setStyle(panel, {
              background: '#fff',
              fontSize: '16px',
              display: 'block',
              'float': 'none',
              padding: '10px',
              margin: '0'
            });
            panelBox.appendChild(panel);

            var img = document.createElement('img');
            img.src = loadingIcon;
            img.alt = '---';
            panel.appendChild(img);

            var request = {extVideoId: clipId, action: 'getVimeoLinks'};
            chrome.extension.sendRequest(request, function(response){
                vimeo.showLinks(response.links, response.title);
            });

            return false;
          }

          panel = panel.parentNode;
          if(panel.style.display == 'none')
          {
            SaveFrom_Utils.addClass(btn, 'active');
            panel.style.display = 'block';
          }
          else
          {
            SaveFrom_Utils.removeClass(btn, 'active');
            panel.style.display = 'none';
          }

          return false;
        }, false);

        var node = document.querySelectorAll('#tools a.btn');
        if(node && node.length > 0)
        {
          node = node[node.length - 1];
          var next = SaveFrom_Utils.nextSibling(node);
          if(next)
            box.insertBefore(btn, next);
          else
            box.appendChild(btn);
        }
        else
          box.insertBefore(btn, box.firstChild);

        return;
      }


      var next = SaveFrom_Utils.nextSibling(box);
      box = box.parentNode;

      var panel = document.createElement('div');
      panel.id = vimeo.panelId;
      SaveFrom_Utils.setStyle(panel, {
        display: 'block',
        padding: '10px 0',
        fontSize: '16px'
      });

      if(next)
        box.insertBefore(panel, next);
      else
        box.appendChild(panel);

      var btn = document.createElement('button');
      btn.id = vimeo.btnPrefix+clipId;
      btn.innerHTML = chrome.i18n.getMessage('download');
      btn.className = 'blue_button';
      SaveFrom_Utils.setStyle(btn, {
        borderRadius: '5px',
        fontSize: '16px'
      });

      btn.addEventListener('click', function(event){
        var request = {extVideoId: clipId, action: 'getVimeoLinks'};
        chrome.extension.sendRequest(request, function(response){
            vimeo.showLinks(response.links, response.title);
        });

        var img = document.createElement('img');
        img.src = loadingIcon;
        img.alt = '---';
        this.parentNode.appendChild(img);

        this.parentNode.removeChild(this);
      }, false);

      panel.appendChild(btn);
    },


    showLinks: function(links, title, customFsIconStyle)
    {
      var box = document.getElementById(vimeo.panelId);
      if(!box)
        return;

      while(box.firstChild)
        box.removeChild(box.firstChild);

      if(links && links.length > 0)
      {
        box.appendChild(document.createTextNode(chrome.i18n.getMessage('download') + ': '));

        var aStyle = {margin: '0 0 0 15px'},
            fsIconStyle = {},
            fsTextStyle = {
              position: 'relative',
              top: '-1px'
            };

        if(iframe)
        {
          aStyle = {
            color: '#fff',
            borderBottom: '1px solid #808080',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            margin: '0 0 0 10px'
          };

          fsIconStyle = {color: '#ffffff', opacity: '.5'};
          fsTextStyle = {color: '#d0d0d0'};
        }

        if (customFsIconStyle !== undefined) {
          fsIconStyle = customFsIconStyle;
        }

        var success = false, color = '';
        for(var i = 0; i < links.length; i++)
        {
          var a = document.createElement('a');
          if(links[i].url && links[i].name)
          {
            success = true;

            var ext = links[i].ext;
            if(!ext)
            {
              ext = 'MP4';
              if(links[i].url.search(/\.flv($|\?)/i) != -1)
                ext = 'FLV';
            }

            var name = links[i].name ? links[i].name : ext;

            a.href = links[i].url;
            a.title = chrome.i18n.getMessage('downloadTitle');
            a.appendChild(document.createTextNode(name));
            SaveFrom_Utils.setStyle(a, aStyle);

            box.appendChild(a);

            SaveFrom_Utils.appendFileSizeIcon(a, fsIconStyle, fsTextStyle);

            if(title && !links[i].noTitle)
            {
              a.setAttribute('download', SaveFrom_Utils.fileName.modify(
                title + '.' + ext.toLowerCase()));

              a.addEventListener('click', function(event){
                SaveFrom_Utils.downloadOnClick(event, null, true);
              }, false);
            }

            if(!color)
              color = SaveFrom_Utils.getStyle(a, 'color');
          }
        }

        if(success)
        {
          if(!color)
            color = '#2786c2';

          if(prefs.moduleShowDownloadInfo == '1')
          {
            box.appendChild(document.createElement('br'));
            SaveFrom_Utils.appendDownloadInfo(box, color);
          }

          return;
        }
      }

      box.appendChild(document.createTextNode(chrome.i18n.getMessage('noLinksFound')));
      return;
    },

    appendIframeButtons: function()
    {
      var p = document.getElementsByTagName('div')[0],
          b = document.createElement('div'),
          a = document.createElement('a'),
          panel = document.createElement('div');

      a.href = '#';
      a.textContent = chrome.i18n.getMessage('download').toLowerCase();
      SaveFrom_Utils.setStyle(a, {
        display: 'inline-block',
        color: 'rgba(255,255,255,.9)',
        textDecoration: 'none',
        padding: '5px 10px'
      });
      b.appendChild(a);

      SaveFrom_Utils.setStyle(b, {
        background: 'rgba(0, 0, 0, .4)',
        border: '1px solid rgba(255,255,255,.5)',
        borderRadius: '4px',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        lineHeight: 'normal',
        position: 'absolute',
        top: '5px',
        left: '5px',
        padding: 0,
        margin: 0,
        zIndex: 99999
      });

      panel.id = vimeo.panelId;
      SaveFrom_Utils.setStyle(panel, {
        color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        border: 0,
        display: 'none',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        fontWeight: 'normal',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        margin: 0,
        padding: '3px',
        zIndex: 99990,
        lineHeight: '31px'
      });

      if(document.body.scrollWidth <= 400)
      {
        panel.style.paddingTop = '28px';
      }

      vimeo.btnBox = document.createElement('div');
      vimeo.btnBox.style.display = 'none';
      vimeo.btnBox.appendChild(b);
      vimeo.btnBox.appendChild(panel);

      document.removeEventListener('mouseover', vimeo.onExtPlayerOver, false);
      document.removeEventListener('mouseout', vimeo.onExtPlayerOver, false);
      document.addEventListener('mouseover', vimeo.onExtPlayerOver, false);
      document.addEventListener('mouseout', vimeo.onExtPlayerOver, false);

      a.addEventListener('click', vimeo.fetchIframeLinks, false);
      a.addEventListener('click', vimeo.toggleIframePanel, false);

      document.body.appendChild(vimeo.btnBox);
    },


    fetchIframeLinks: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var button = e.target;

      // try to get links from document
      var scripts = document.querySelectorAll('script'),
          l = scripts.length, i, content, matches, config,
          links = null, hd = false, title = '',
          re = new RegExp('=(\{\"cdn_url\"\:.*?\});', 'i'),
          re2 = new RegExp('clip' + vimeo.clipId + '_\\d+\\s*=\\s*(\\{[\\s\\S]+?\\})\\s*;', 'i');

      for(i=0; i<l; i++)
      {
        content = scripts[i].innerHTML;
        //if(content && (matches = content.match(/=(\{\"cdn_url\"\:.*?\});/i)))
        if(content && ( (matches = content.match(re)) || (matches = content.match(re2)) ))
          break;
      }

      if(matches) {
        try {
          matches = matches[1].replace(/(\{|,)\s*(\w+)\s*:/ig, '$1"$2":').
            replace(/(:\s+)\'/g, '$1"').replace(/\'([,\]\}])/g, '"$1');
          config = JSON.parse(matches);

          links = [];

          if(config.config) {
            config = config.config;
            if(config && config.request && config.video &&
              config.request.signature && config.request.timestamp)
            {
              var data = {
                'clip_id': vimeo.clipId,
                'sig': config.request.signature,
                'time': config.request.timestamp,
                'type': 'moogaloop_local',
                'quality': 'sd',
                'codecs': 'H264,VP8,VP6'
              };

              links.push({
                url: 'http://player.vimeo.com/play_redirect?' +
                  SaveFrom_Utils.getQueryString(data),
                name: 'SD',
                type: 'mp4',
                ext: 'MP4'
              });

              if(config.video.hd == 1)
              {
                data.quality = 'hd';
                hd = true;
                links.push({
                  url: 'http://player.vimeo.com/play_redirect?' +
                    SaveFrom_Utils.getQueryString(data),
                  name: 'HD',
                  type: 'mp4',
                  ext: 'MP4'
                });
              }

              if(config.video.files && config.video.files.h264)
              {
                var files = config.video.files.h264;
                if(files.length > 0)
                {
                  for(var i = 0; i < files.length; i++)
                  {
                    if(files[i] != 'sd' && files[i] != 'hd')
                    {
                      data.quality = files[i];
                      links.push({
                        url: 'http://player.vimeo.com/play_redirect?' +
                          SaveFrom_Utils.getQueryString(data),
                        name: (files[i].length <= 3) ? files[i].toUpperCase() :
                          ucfirst(files[i].toLowerCase()),
                        type: 'mp4',
                        ext: 'MP4'
                      });
                    }
                  }
                }
              }
            }
          } else {

            for(i in config.request.files.h264) {
              var url = config.request.files.h264[i].url,
                  t = url.match(/\.([a-z0-9]+)\?/i);
              if(i == 'hd')
                hd = true;

              links.push({
                'ext': t[1],
                'name': i.toUpperCase(),
                'type': t[1],
                'url': url
              });
            }

          }

          if(config.video.title)
            title = config.video.title;

        } catch(e) {
          // no data
        }
      }

      if(links && hd)
      {
        vimeo.appendIframeLinks(links, title, button);
      }
      else
      {

        var request = {
          action: 'getVimeoLinks',
          extVideoId: vimeo.clipId
        };

        chrome.extension.sendRequest(request, function(response){
          if(response.links)
          {
            vimeo.appendIframeLinks(response.links, response.title, button);
          }
        });

        vimeo.appendIframeLinks(chrome.i18n.getMessage('download') + ' ...', button);
      }
    },


    appendIframeLinks: function(links, title, button)
    {
      var panel = document.getElementById(vimeo.panelId);

      if(typeof(links) == 'object')
      {
        vimeo.showLinks(links, title);
        button.removeEventListener('click', vimeo.fetchIframeLinks, false);
      }
      else if(typeof(links) == 'string')
      {
        panel.innerHTML = links;
      }
    },


    toggleIframePanel: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var panel = document.getElementById(vimeo.panelId);
      if(panel)
      {
        panel.style.display = (panel.style.display == 'none') ? '' : 'none';
      }
    },


    onExtPlayerOver: function(event)
    {
      if(vimeo.btnBox)
      {
        if(event.type == 'mouseover')
        {
          if(vimeo.btnBox.style.display == 'none')
            vimeo.btnBox.style.display = 'block';
        }
        else if(event.type == 'mouseout')
        {
          vimeo.btnBox.style.display = 'none';
        }
      }
    }
  };


  function ucfirst(str)
  {
    if(str.length)
      str = str.charAt(0).toUpperCase() + str.slice(1);

    return str;
  }


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('vimeo', response);
    prefs = response;
    SaveFrom_Utils.runModule(response, vimeo);
  });
};
_modules.vk = function(){
  var iframe = false, videoExt = false;

  if(window.location.href.search(/\/video_ext\.php\?.+/) > -1)
    videoExt = true;

  if(window.top != window.self)
  {
    if(!videoExt && window.location.href.search(/\/widget_comments\.php\?.+/) == -1)
      return;

    iframe = true;
  }

  window.savefrom__lm = {};

  var moduleName = 'vk',
      prefs = {};

  function showVideoLinks(response)
  {
    //console.log('vk showVideoLinks', response);
    var links = response.links;
    if (response.extVideoId == video.extVideoId && links && video.iframeParent)
    {
      video.show(response.links, response.title,
        null, video.style, response.action);
    }
  }


  // actions
  chrome.extension.onRequest.addListener(function(request, sender, callback){
    switch(request.action)
    {
      case 'updateLinks':
        updateLinks();
        break;

      case 'downloadMP3Files':
        audio.showListOfAudioFiles(false);
        break;

      case 'downloadPlaylist':
        audio.showListOfAudioFiles(true);
        break;

      case 'downloadPhotos':
        embedPhoto.download();
        break;
    }
  });


  var domain = window.location.hostname.replace(/^(?:[\w\-]+\.)*(\w+\.[a-z]{2,6})$/i, '$1');
  var downloadLinkClassName = 'savefrom_vk_download';
  var mp3InfoCache = {};
  var titleTimer = 0;
  var curModule = '';


  function updateLinks()
  {
    removeDownloadLinks();
    audio.showLinks();
    video.showLinks();
    photo.showLinks();
  }


  function autoFocusLoginForm()
  {
    if(window.location.href.search(/https?:\/\/(vkontakte\.ru|vk\.com)\/(login\.php)?$/i) != -1)
    {
      var email = document.getElementById('email');
      if(email && email.tagName == 'INPUT' && email.focus)
        setTimeout(function(){email.focus();}, 1000);
    }
  }


  function createTextLink(href, text, blank) {
    if(blank == undefined)
      blank = true;

    var a = document.createElement('a');
    a.href = href;
    a.className = downloadLinkClassName;
    a.innerHTML = text;

    if(blank)
      a.setAttribute('target', '_blank', false);

    return a;
  }


  function removeDownloadLinks()
  {
    var selector = 'a.' + downloadLinkClassName +
      ',div.' + downloadLinkClassName +
      ',span.' + downloadLinkClassName;

    var e = document.querySelectorAll(selector);
    for(var i = e.length-1; i >= 0; i--)
      e[i].parentNode.removeChild(e[i]);
  }


  function getModuleName()
  {
    var attr = 'data-sf--module';

    var s = document.createElement('script');
    s.text = '(function(){\
      if(window..cur.module && typeof(window.cur.module) == \'string\')\
      {\
        document.body.setAttribute(\'' + attr + '\', window.cur.module);\
      }\
    })();';

    var value = document.body.getAttribute(attr);
    if(value)
    {
      curModule = value;
      document.body.removeAttribute(attr);
      s.parentNode.removeChild(s);
    }

    return value;
  }



  ///////////////////////////////////////////////////////////////////
  //  AUDIO

  var audio = {
    downloadIdPrefix: 'savefrom_vk_audio_download_',
    infoIdPrefix: 'savefrom_vk_audio_info_',
    visibleAttr: 'savefrom_vk_audio_visible',
    rowIdAttr: 'savefrom_vk_audio_row',
    lastRow: null,
    timer: 0,
    timerdl: 0,


    showRowElements: function(row)
    {
      if(!row)
        return;

      var node = row.querySelectorAll('a.' + downloadLinkClassName);

      if(!node || node.length == 0)
      {
        audio.showRowLinks(row);
      }
    },

    getMp3Link: function(elID, cb) {
      var audioId = elID.split('_');
      var ownerId = audioId[0];
      audioId = audioId[1];
      var query = 'act=reload_audio&al=1&audio_id='+audioId+'&owner_id='+ownerId;
      SaveFrom_Utils.sendRequest(document.location.protocol + '//' + domain + '/audio', function(r) {
        if (r.status !== 200) {
          return cb();
        }
        var text = r.responseText;
        text = text.substr(text.indexOf('['));
        try {
          var arr = JSON.parse(text);
          var src = arr[0].substr(0, arr[0].indexOf('?'));
          cb(elID, src);
        } catch(e) {
          return cb();
        }
      }, 'POST', '', query);
    },

    getAudioLinks: function(parent, cb)
    {
      if(!parent)
        parent = document;

      var links = {};

      var img = parent.querySelectorAll('img.playimg');
      for(var i = 0; i < img.length; i++)
      {
        var a = '';
        try
        {
          a = img[i].getAttribute('onclick', false);
        }
        catch(err)
        {
          a = img[i].onclick;
        }

        a = a.toString();

        if(a && a.search(/(operate|operatewall)/i) >= 0)
        {
          var audioId = '', src = '';
          var r = a.match(/(?:operate|operatewall)\s*\x28\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\x22\x27](\w+)[\x22\x27]/i);
          if(r && r.length > 4)
          {
            audioId = r[1];
            src = 'http://cs' + r[2] + '.' + domain + '/u' + r[3] + '/audio/' + r[4] + '.mp3';
          }
          else
          {
            var r = a.match(/(?:operate|operatewall)\s*\x28\s*[\x22\x27]?([\w\-]+)[\x22\x27]?\s*,\s*[\x22\x27](https?:\/\/[\w\_]+\.(?:vkontakte\.ru|vk\.com)\/u\d+\/audio\/\w+\.mp3)[\x22\x27]/i);
            if(r && r.length > 2)
            {
              audioId = r[1];
              src = r[2];
            }
          }

          if(!audioId && img[i].id && img[i].id.search(/^imgbutton/i) != -1)
            audioId = img[i].id.replace(/^imgbutton/i, '');

          links[audioId] = src;
        }
      }

      if (cb !== undefined) {
        var wait_link = 0;
        var ready_link = 0;
        var gotLink = function (audioId, src) {
          ready_link++;
          if (src) {
            links[audioId] = src;
          }
          if (wait_link !== ready_link) {
            return;
          }
          cb(links);
        };
      }

      var play = parent.querySelectorAll('div.play, div.play_new');
      if(play && play.length > 0)
      {
        for(var i = 0; i < play.length; i++)
        {
          if(play[i].id)
          {
            var audioId = play[i].id.replace(/^[^\d]+?(\-?\d+.+)$/i, '$1');
            var info = document.getElementById('audio_info' + audioId);
            if(info && info.value)
            {
              var src = SaveFrom_Utils.getMatchFirst(info.value,
                /(https?:\/\/.+\.mp3)/i);
              if(src)
              {
                links[audioId] = src;
              } else
              if (cb !== undefined) {
                wait_link++;
                audio.getMp3Link(audioId, gotLink);
              }
            }
          }
        }
      }

      if (cb !== undefined) {
        if (wait_link === 0) {
          cb(links);
        }
        return;
      }

      return links;
    },


    showRowLinks: function(row)
    {
      if ( ['ac_performer','pd_performer'].indexOf(row.id) !== -1 ) {
        if (audio.tmp_creating) {
          return;
        }
        audio.tmp_creating = true;
        pageLS.get('pad_lastsong', function(data) {
          audio.handleAudioRow(data, 1, row);
          audio.tmp_creating = false;
        });
        return;
      }
      audio.getAudioLinks(row, function(links) {
        for(var i in links)
        {
          audio.handleAudioRow(i, links[i]);
        }
      });
    },


    showLinks: function()
    {
      for(var i in mp3InfoCache)
        delete mp3InfoCache[i];

      // remove visibleAttr
      var node = document.querySelectorAll('*[' + audio.visibleAttr + '="1"]');
      if(node && node.length > 0)
      {
        for(var i = 0; i < node.length; i++)
          node[i].removeAttribute(audio.visibleAttr, false);
      }

      SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName + ' .icon-over', {
        'display': 'none'
      });
      SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName + ' .icon', {
        'display': 'block'
      });
      SaveFrom_Utils.addStyleRules('.audio .actions .' + downloadLinkClassName, {
        'display': 'none'
      });

      SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName + ':hover .icon-over', {
        'display': 'block'
      });
      SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName + ':hover .icon', {
        'display': 'none'
      });
      SaveFrom_Utils.addStyleRules('.audio.over .actions .' + downloadLinkClassName, {
        'display': 'block'
      });
      SaveFrom_Utils.addStyleRules('.audio.over .duration', {
        'opacity': '0'
      });
      SaveFrom_Utils.addStyleRules('.savefrom-tooltip', {
        background: '#FFF',
        border: '1px solid #96AABE',
        padding: '2px 5px 3px',
        color: '#2C587D',
        'max-width': '200px'
      });

      document.removeEventListener('mouseover', audio.onMouseOver, false);
      document.addEventListener('mouseover', audio.onMouseOver, false);
    },


    onMouseOver: function(event)
    {
      var node = event.target;
      var row = SaveFrom_Utils.getParentByClass(node, ['audioRow', 'audioRowWall', 'audio']);

      if (!row) {
        if (['ac_performer','pd_performer'].indexOf(node.id) !== -1) {
          row = node;
        }
      }

      if(row)
      {
        window.clearTimeout(audio.timer);

        if(audio.lastRow == row)
          return;

        audio.timer = window.setTimeout(function(){
          audio.lastRow = row;
          audio.showRowElements(audio.lastRow);
        }, 0);
      }
    },

    handleAudioRow: function(id, mp3Src, current)
    {
      if(!id || !mp3Src)
        return false;

      var duration, title, actions, row;
      if (current) {
        var currentTrack = JSON.parse(id);
        id = currentTrack[0] + '_' + currentTrack[1];
        row = {id: id};
        mp3Src = currentTrack[2];
        duration = {innerText: currentTrack[4]};
        title = currentTrack[5] + ' - ' + currentTrack[6];
        actions = current;
        mp3Src = mp3Src.substr(0, mp3Src.indexOf('?'));
      } else {
        row = document.getElementById('audio' + id);
        if (!row)
          return false;

        var parent = row.querySelector('.info');
        if (!parent)
          return;

        parent.style.position = 'relative';

        duration = row.querySelector('div.duration');
        if (!duration)
          return false;

        actions = row.querySelector('div.actions');
        if (!actions)
          return false;

        title = audio.getTitle(id, row);
      }
      var link1 = createTextLink(mp3Src, '');
      link1.id = audio.downloadIdPrefix + id;
      //link1.title = chrome.i18n.getMessage('downloadTitle');
      link1.setAttribute(audio.rowIdAttr, row.id);
      link1.setAttribute('data-savefrom-helper-duration',
        audio.secondsFromDurationNode(duration));
      link1.className = downloadLinkClassName + ' audio_edit_wrap fl_r';

      if(title)
      {
        title += '.mp3';
        link1.setAttribute('download', SaveFrom_Utils.fileName.modify(title));
      }

      SaveFrom_Utils.setStyle(link1, {
        color: '#fff',
        fontWeight: 'normal',
        width: 'auto',
        background: 'none',
        opacity: 1
      });

      if(!current && !actions.querySelector('div.audio_edit_wrap') && !actions.querySelector('div.audio_remove_wrap') && !actions.querySelector('div.audio_add_wrap'))
      {
        if(!SaveFrom_Utils.getParentByClass(parent, 'post_media'))
        {
          if(SaveFrom_Utils.getParentByClass(parent, 'pad_audio_table'))
            SaveFrom_Utils.setStyle(link1, {
              margin: '9px 9px 9px 0'
            });
          else
            SaveFrom_Utils.setStyle(link1, {
              margin: '6px 6px 6px 0'
            });
        }
        else if(SaveFrom_Utils.getParentByClass(parent, 'audio_list'))
        {
          SaveFrom_Utils.setStyle(link1, {
            padding: '0'
          });
        }
      }
      else
      if (!current) {
        var titleWrap = parent.querySelector('.title_wrap');
        if(titleWrap)
          titleWrap.style.width = (parseInt(SaveFrom_Utils.getStyle(titleWrap, 'width')) - 30) + 'px';

        if(SaveFrom_Utils.getParentByClass(parent, 'pad_audio_table'))
          SaveFrom_Utils.setStyle(link1, {
            margin: '9px 7px 0 0'
          });
      }

      link1.addEventListener('click', audio.onDownloadLinkClick, false);

      var icon = document.createElement('img');
      icon.className = 'icon';
      if (current) {
        icon.src = SaveFrom_Utils.svg.getSrc('download', '#6C8CAC');
      } else {
        icon.src = SaveFrom_Utils.svg.getSrc('download', '#b4c3d3');
      }
      SaveFrom_Utils.setStyle(icon, {
        width: '16px',
        height: '16px',
        verticalAlign: 'middle',
        //opacity: '0.9',
        cursor: 'pointer'
      });
      icon.addEventListener('mouseover', audio.onDownloadLinkHover, false);
      icon.addEventListener('mouseout', audio.onDownloadLinkHover, false);

      var iconOver = icon.cloneNode(true);
      iconOver.className = 'icon-over';
      if (current) {
        iconOver.src = SaveFrom_Utils.svg.getSrc('download', '#5D80A4');
      } else {
        iconOver.src = SaveFrom_Utils.svg.getSrc('download', '#78A2CC');
      }
      iconOver.addEventListener('mouseover', audio.onDownloadLinkHover, false);
      iconOver.addEventListener('mouseout', audio.onDownloadLinkHover, false);

      link1.appendChild(icon);
      link1.appendChild(iconOver);

      if (current) {
        SaveFrom_Utils.setStyle(link1, {
          padding: 0,
          margin: 0,
          cssFloat: 'left',
          marginRight: '3px',
          marginTop: '1px',
          marginBottom: '-2px'
        });
        SaveFrom_Utils.setStyle(icon, {
          width: '12px',
          height: '12px'
        });
        SaveFrom_Utils.setStyle(iconOver, {
          width: '12px',
          height: '12px'
        });
        actions.insertBefore(link1, actions.firstChild);
      } else {
        SaveFrom_Utils.setStyle(actions, {
          'zIndex': 2
        });
        actions.appendChild(link1);
      }

      if(prefs.vkShowBitrate == '1')
        audio.onDownloadLinkHover(false, link1);

      return true;
    },

    onDownloadLinkHover: function(event, link)
    {
      if(event)
        link = event.target.parentNode;

      window.clearTimeout(audio.timerdl);

      if(event && event.type == 'mouseover')
      {
        SaveFrom_Utils.showTooltip(link.querySelector('img.icon-over'), link.getAttribute('savefrom-title') || '<img src="/images/upload.gif" />', SaveFrom_Utils.getParentByClass(link, 'audio'));
      }

      if(!event || event.type == 'mouseover' && !link.getAttribute('savefrom-title'))
      {
        audio.timerdl = window.setTimeout(function() {

          var title, request = {
            action: 'getFileSize',
            url: link.href
          };

          chrome.extension.sendRequest(request, function(response){
            if(response.fileSize == 0)
            {
              if(event)
                SaveFrom_Utils.showTooltip(link.querySelector('img.icon-over'), chrome.i18n.getMessage('getFileSizeFailTitle'), SaveFrom_Utils.getParentByClass(link, 'audio'));
            }
            else
            {
              var seconds = link.getAttribute('data-savefrom-helper-duration', false);
              seconds = parseInt(seconds);
              if(!isNaN(seconds))
              {
                var size = SaveFrom_Utils.sizeHuman(response.fileSize, 2);
                var bitrate = Math.floor((response.fileSize / seconds) / 125) + ' ' +
                  chrome.i18n.getMessage('kbps');

                title = ' (' + size + ' ~ ' + bitrate + ')';
              }
              else
              {
                title = ' (' + SaveFrom_Utils.sizeHuman(response.fileSize, 2) + ')';
                //node.title = response.fileType ? response.fileType : '';
              }

              if(event)
                SaveFrom_Utils.showTooltip(link.querySelector('img.icon-over'), title, SaveFrom_Utils.getParentByClass(link, 'audio'));
              link.setAttribute('savefrom-title', title);
            }
          });

        }, event ? 1000 : 100);

        // don't reset timer when vkShowBitrate is true
        if(!event)
          audio.timerdl = null;
      }
    },

    onDownloadLinkClick: function(event)
    {
      if(event.button == 2)
        return false;

      event.stopPropagation();
      SaveFrom_Utils.downloadOnClick(event, null, true);

      var rowId = this.getAttribute(audio.rowIdAttr);
      if(rowId)
      {
        var row = document.getElementById(rowId);
        if(row)
        {
          row.style.backgroundColor = '#f4f7fc';
          row.setAttribute(audio.visibleAttr, '1', false);
        }
      }

      return false;
    },


    onCloseBtnClick: function(event)
    {
      if(event.button == 2)
        return true;

      event.preventDefault();
      event.stopPropagation();

      parent = SaveFrom_Utils.getParentByClass(this, downloadLinkClassName);
      if(parent)
        parent.style.display = 'none';

      return false;
    },


    getTitle: function(id, row)
    {
      if(!id || !row)
        return '';

      var name = '';

      var performer = row.querySelector('#performer' + id);
      if(!performer)
      {
        performer = row.querySelector('#performerWall' + id);
        if(!performer)
          performer = row.querySelector('.info b');
      }

      var title = row.querySelector('#title' + id);
      if(!title)
      {
        title = row.querySelector('#titleWall' + id);
        if(!title)
          title = row.querySelector('span.title');
      }

      if(performer && performer.textContent)
        name += SaveFrom_Utils.trim(performer.textContent);

      if(title && title.textContent)
      {
        if(name)
          name += ' - ';

        name += SaveFrom_Utils.trim(title.textContent);
      }

      if(name)
        return name.replace(/\<a\s+[^\>]+\>/ig, '').replace(/\<\/a\>/ig, '');

      return '';
    },


    secondsFromDurationNode: function(node)
    {
      if(!node)
        return 0;

      var text = node.innerText;
      if(!text)
        return 0;

      var m = text.match(/^(?:\s*(\d+)\s*\:)?\s*(\d+)\s*\:\s*(\d+)/);
      if(m && m.length > 3)
      {
        if(!m[1])
          m[1] = 0;

        return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
      }

      return 0;
    },


    showListOfAudioFiles: function(playlist)
    {
      var links = audio.getAudioLinks(document);

      var html = '';
      if(playlist)
      {
        var list = [];
        for(var i in links)
        {
          var id = i;
          var row = document.getElementById('audio' + id);
          if(row)
          {
            var title = audio.getTitle(id, row);

            var duration = 0;
            var d = row.querySelector('div.duration');
            if(d)
              duration = audio.secondsFromDurationNode(d);

            list.push({url: links[i], title: title, duration: duration});
          }
        }

        if(list.length > 0)
        {
          SaveFrom_Utils.playlist.popupPlaylist(list, 'vk_playlist', true);
          return true;
        }
      }
      else
      {
        var list = [];
        for(var i in links)
        {
          list.push({url: links[i]});
        }

        if(list.length > 0)
        {
          SaveFrom_Utils.playlist.popupFilelist(list);
          return true;
        }
      }

      alert(chrome.i18n.getMessage('vkMp3LinksNotFound'));
      return false;
    }
  };

  //  /AUDIO
  ///////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////
  //  VIDEO

  var videoLinks = {
    getFlvLink: function(v)
    {
      if(v.host.search(/^https?:\/\//i) != -1)
      {
        if(v.host.charAt(v.host.length - 1) != '/')
          v.host += '/';

        if(v.host.search(/^https?:\/\/cs\d+\./i) != -1)
          return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.flv';

        return v.host + 'assets/video/' + v.vtag + v.vkid + '.vk.flv';
      }

      if(v.host.search(/\D/) == -1)
        return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.flv';

      return 'http://' + v.host + '/assets/video/' + v.vtag + v.vkid + '.vk.flv';
    },


    getMp4Link: function(v, q)
    {
      if(q == 240 && v.no_flv == 0)
        return videoLinks.getFlvLink(v);

      if(v.host.search(/^https?:\/\//i) != -1)
      {
        if(v.host.charAt(v.host.length - 1) != '/')
          v.host += '/';

        return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
      }

      return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
    },


    getLinks: function(v)
    {
      if(!v || !v.host || !v.vtag || (!v.vkid && !v.uid))
        return null;

      if(typeof(v.host) != 'string' && v.host.toString)
        v.host = v.host.toString();

      v.host = v.host.replace(/\\\//g, '/');

      if(v.hd > 0 && (!v.hd_def || v.hd > v.hd_def))
        v.hd_def = v.hd;

      var links = [];
      if(v.hd_def <= 0 && v.no_flv == 0)
      {
        links.push({
          url: videoLinks.getFlvLink(v),
          name: 'FLV',
          subname: '',
          type: 'flv'
        });
      }
      else
      {
        links.push({
          url: videoLinks.getMp4Link(v, 240),
          name: (v.no_flv == 0) ? 'FLV' : 'MP4',
          subname: '',
          type: (v.no_flv == 0) ? 'flv': 'mp4'
        });

        if(v.hd_def > 0)
        {
          links.push({
            url: videoLinks.getMp4Link(v, 360),
            name: 'MP4',
            subname: '360',
            type: 'mp4'
          });

          if(v.hd_def > 1)
          {
            links.push({
              url: videoLinks.getMp4Link(v, 480),
              name: 'MP4',
              subname: '480',
              type: 'mp4'
            });

            if(v.hd_def > 2)
            {
              links.push({
                url: videoLinks.getMp4Link(v, 720),
                name: 'MP4',
                subname: '720',
                type: 'mp4'
              });
            }
          }
        }
      }

      return links;
    }
  };


  var video = {
    popupTimer: 0,
    iframeParent: null,
    extVideoId: null,
    panelId: 'savefrom__vk_video_links',
    videoAttr: 'data-savefrom-video',
    hiddenAttr: 'data-savefrom-hidden',
    btnBox: null,

    style: {fontSize: '10pt', margin: '15px 0', padding: '0'},


    getSingleVideoInfo: function()
    {
      var json = SaveFrom_Utils.getMatchFirst(document.body.innerHTML,
        /loadflashplayer\s*\(\s*(\{[^\}]+\})/i);
      if(json)
      {
        var o = null;
        try
        {
          o = JSON.parse(json);
        }
        catch(err){}

        if(o)
          return o;
      }

      var e = SaveFrom_Utils.getElementByIds(['player', 'playerObj']);
      if(e && e.tagName == 'OBJECT')
      {
        var fv = '', cn = e.childNodes;
        for(var i = cn.length - 1; i >= 0; i--)
        {
          if(cn[i].nodeType == '1' && cn[i].name == 'flashvars')
          {
            try{fv = cn[i].value;}catch(err){fv = cn[i].getAttribute('value', false);}
            break;
          }
        }

        var host = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])host=([^\s\"\&]+)/i);
        var vtag = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])vtag=([\w\-]+)/i);
        var vkid = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])vkid=(\d+)/i);
        var uid = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])uid=(\d+)/i);
        var no_flv = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])no_flv=(\d+)/i);
        var hd_def = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])hd_def=(\d+)/i);
        var hd = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])hd=(\d+)/i);
        var md_title = SaveFrom_Utils.getMatchFirst(fv, /(?:^|[\?\&])md_title=([^\s\"\&]+)/i);
        if(md_title)
          md_title = decodeURIComponent(md_title);

        if(hd > 0 && (!hd_def || hd > hd_def))
          hd_def = hd;

        if(host && vtag && (vkid || uid))
        {
          return {
            host: host,
            uid: uid,
            vtag: vtag,
            vkid: vkid,
            hd_def: hd_def,
            no_flv: no_flv,
            md_title: md_title
          };
        }
      }

      return null;
    },


    onExtPlayerOver: function(event)
    {
      if(video.btnBox)
      {
        var panel = document.getElementById(video.panelId);
        if(panel && (panel.getAttribute(video.videoAttr) != 'active' ||
          panel.getAttribute(video.hiddenAttr)))
        {
          panel = null;
        }

        if(event.type == 'mouseover')
        {
          if(video.btnBox.style.display == 'none')
            video.btnBox.style.display = 'block';

          if(panel)
            panel.style.display = 'block';
        }
        else if(event.type == 'mouseout')
        {
          video.btnBox.style.display = 'none';

          if(panel)
            panel.style.display = 'none';
        }
      }
    },


    appendButton: function(links, title, style, request)
    {
      var parent = document.getElementById('mv_controls_line');
      if(videoExt)
        parent = document.getElementById('playerWrap');

      if(!parent)
        return;

      if(parent.querySelector('.' + downloadLinkClassName))
        return;

      var panel = document.getElementById(video.panelId);
      if(panel)
        panel.parentNode.removeChild(panel);

      var box, a;

      if(videoExt)
      {
        if(video.btnBox)
          video.btnBox.parentNode.removeChild(video.btnBox);

        box = document.createElement('div');
        box.id = video.btnBoxId;
        box.className = downloadLinkClassName;
        SaveFrom_Utils.setStyle(box, {
          background: '#000',
          border: '1px solid #fff',
          display: 'none',
          fontFamily: 'Arial,Helvetica,sans-serif',
          fontSize: '13px',
          lineHeight: 'normal',
          position: 'absolute',
          top: '2px',
          right: '2px',
          padding: '3px 5px',
          margin: 0,
          zIndex: 99999
        });

        video.btnBox = box;
        document.removeEventListener('mouseover', video.onExtPlayerOver, false);
        document.removeEventListener('mouseout', video.onExtPlayerOver, false);
        document.addEventListener('mouseover', video.onExtPlayerOver, false);
        document.addEventListener('mouseout', video.onExtPlayerOver, false);

        a = document.createElement('a');
        a.href = '#';
        a.textContent = chrome.i18n.getMessage('download');
        a.style.color = '#fff';
        a.style.textDecoration = 'none';
        box.appendChild(a);

        panel = document.createElement('div');
        panel.id = video.panelId;
        panel.className = downloadLinkClassName;
        SaveFrom_Utils.setStyle(panel, {
          background: '#000',
          border: 0,
          display: 'block',
          fontFamily: 'Arial,Helvetica,sans-serif',
          fontSize: '13px',
          lineHeight: 'normal',
          position: 'absolute',
          top: '25px',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
          zIndex: 99990
        });
        parent.parentNode.insertBefore(panel, parent);
      }
      else
      {
        box = document.createElement('span');
        box.className = downloadLinkClassName;

        var d = document.createElement('span');
        d.className = 'divider';
        d.textContent = '|';
        box.appendChild(d);

        a = document.createElement('a');
        a.href = '#';
        a.textContent = chrome.i18n.getMessage('download');
        a.style.color = '#a0a0a0';
        a.style.fontWeight = 'bold';
        box.appendChild(a);

        panel = document.createElement('div');
        panel.id = video.panelId;
        panel.className = downloadLinkClassName;
        parent.parentNode.insertBefore(panel, parent);
      }

      a.addEventListener('click', function(event){
        event.stopPropagation();
        event.preventDefault();

        if(panel.getAttribute(video.videoAttr) == 'active')
        {
          if(panel.style.display == 'none')
          {
            panel.style.display = 'block';
            panel.removeAttribute(video.hiddenAttr);
          }
          else
          {
            panel.style.display = 'none';
            panel.setAttribute(video.hiddenAttr, '1');
          }

          return false;
        }

        panel.setAttribute(video.videoAttr, 'active');

        if(links)
          video.show(links, title, panel, style);
        else if(request)
        {
          video.show('<img src="/images/upload.gif"/>', '', panel, style);

          chrome.extension.sendRequest(request, function(response){
            showVideoLinks(response);
          });
        }

        return false;
      }, false);

      parent.appendChild(box);
    },


    show: function(links, title, parent, style, action)
    {
      if(!links)
        return;

      if(!parent)
        parent = document.getElementById(video.panelId);

      if(!parent)
        return;

      SaveFrom_Utils.emptyNode(parent);

      if(action == 'getYoutubeLinks')
      {
        SaveFrom_Utils.video.yt.init(prefs);
        SaveFrom_Utils.video.yt.show(links, parent, prefs.moduleShowDownloadInfo, {
          link: null,
          text: null,
          btn: {color: '#777', borderColor: '#555', fontSize: '95%'},
          fsIcon: null,
          fsText: {fontSize: '80%'}
        }, title);

        return;
      }

      if(title)
        title = SaveFrom_Utils.trim(title.replace(/\x2B+/g, ' '));

      var html = false;
      if(typeof(links) == 'string')
        html = true;
      else if(links.length == 0)
        return;

      if(videoExt)
      {
        SaveFrom_Utils.setStyle(parent, {
          color: '#fff',
          display: 'block',
          float: 'none',
          fontSize: '11pt',
          fontWeight: 'normal',
          margin: 0,
          padding: '5px',
          textAlign: 'center'
        });
      }
      else
      {
        SaveFrom_Utils.setStyle(parent, {
          color: '#555',
          display: 'block',
          float: 'none',
          fontSize: '11pt',
          fontWeight: 'bold',
          margin: '15px 0',
          padding: '0',
          textAlign: 'center'
        });
      }

      if(style && typeof(style) == 'object')
        SaveFrom_Utils.setStyle(parent, style);

      if(html)
      {
        parent.innerHTML = links;
        return;
      }

      var color = '';
      for(var i = 0; i < links.length; i++)
      {
        var a = null;

        if(typeof(links[i]) == 'object' && links[i].url)
        {
          var ext = links[i].ext;
          if(!ext)
          {
            ext = 'FLV';
            if(links[i].url.search(/\.mp4$/i) != -1)
              ext = 'MP4';
          }

          var name = links[i].name ? links[i].name : ext;
          a = createTextLink(links[i].url, name);

          if(!links[i].noTitle)
          {
            if(title)
            {
              a.setAttribute('download', SaveFrom_Utils.fileName.modify(
                title + '.' + ext.toLowerCase()));
            }

            a.addEventListener('click', function(event){
              SaveFrom_Utils.downloadOnClick(event, null, true);
            }, false);
          }

          if(links[i].subname)
          {
            var st = document.createElement('span');
            SaveFrom_Utils.setStyle(st, {
              fontSize: '80%',
              fontWeight: 'normal',
              marginLeft: '3px'
            });
            st.innerText = links[i].subname;
            a.appendChild(st);
          }
        }

        if(a)
        {
          a.style.marginLeft = '10px';
          if(videoExt)
            a.style.color = '#fff';

          a.title = chrome.i18n.getMessage('downloadTitle');
          parent.appendChild(a);

          SaveFrom_Utils.appendFileSizeIcon(a,
            {color: '#a0a0a0', opacity: '.75'},
            {fontSize: '95%', opacity: '.9'});

          if(!color)
            color = SaveFrom_Utils.getStyle(a, 'color');
        }
      }

      if(prefs.moduleShowDownloadInfo == '1' && !videoExt)
      {
        if(!color)
          color = '#a0a0a0';

        parent.appendChild(document.createElement('br'));
        SaveFrom_Utils.appendDownloadInfo(parent, color);
      }
    },


    showLinks: function()
    {
      var v = video.getSingleVideoInfo();
      if(v && v.host)
      {
        var links = videoLinks.getLinks(v);
        if(links)
        {
          video.appendButton(links, v.md_title);
          return true;
        }
      }

      video.catchPopup();
      var result = false;
      var count = 0;

      var a = document.getElementsByTagName('a');
      for(var i = 0; i < a.length; i++)
      {
        if(a[i].href && a[i].href.search(/\/?video[\d\_\-]+/i) != -1)
        {
          var onclick = '';
          try
          {
            onclick = a[i].getAttribute('onclick', false);
          }
          catch(err)
          {
            onclick = a[i].onclick;
          }

          if(onclick)
          {
            var json = SaveFrom_Utils.getMatchFirst(onclick,
              /showvideoboxcommon\s*\(\s*(\{[^\}]+\})/i);
            if(json)
            {
              var o = null;
              try
              {
                var o = JSON.parse(json);
              }
              catch(err){}

              if(o)
              {
                if(o.hd > 0 && (!o.hd_def || o.hd > o.hd_def))
                  o.hd_def = o.hd;

                var links = videoLinks.getLinks(o);
                if(links)
                  video.appendButton(links, o.md_title, video.style);
              }
            }
          }
        }
      }

      video.catchPopupLinks();

      return result;
    },


    catchPopupLinks: function()
    {
      document.removeEventListener('click', video.onVideoClick, false);
      document.addEventListener('click', video.onVideoClick, false);
    },


    catchPopup: function(event)
    {
      clearInterval(video.popupTimer);

      if(video.getPopupLinks())
        return;

      var count = 0;

      video.popupTimer = setInterval(function(){
        if(count >= 10 || video.getPopupLinks())
        {
          clearInterval(video.popupTimer);
          return;
        }

        count++;
      }, 1000);
    },


    getPopupLinks: function()
    {
      var ids = ['mv_layer_wrap', 'box_layer_wrap'];
      var box = SaveFrom_Utils.getElementByIds(ids);
      if(!box)
        return false;

      var embed = box.querySelector('embed'), iframe = null;
      if(!embed)
        iframe = box.querySelector('iframe');

      var extVideoId, parent;
      if(iframe && iframe.src)
      {
        parent = video.getPopupParent(iframe, true);

        extVideoId = SaveFrom_Utils.getMatchFirst(iframe.src,
          /youtube.com\/embed\/([\w\-]+)/i);
        if(extVideoId && !prefs.lite)
        {
          // youtube
          video.extVideoId = extVideoId;
          video.iframeParent = parent;

          video.appendButton('', '', video.style, {
            action: 'getYoutubeLinks',
            extVideoId: extVideoId
          });

          return true;
        }

        extVideoId = SaveFrom_Utils.getMatchFirst(iframe.src,
          /vimeo.com\/video\/(\d+)/i);
        if(extVideoId)
        {
          video.extVideoId = extVideoId;
          video.iframeParent = parent;

          video.appendButton('', '', video.style, {
            action: 'getVimeoLinks',
            extVideoId: extVideoId,
          });

          return true;
        }
      }

      video.extVideoId = null;
      video.iframeParent = null;

      if(!embed)
      {
        return video.getLinksFromHtml5Video(box);
      }

      var src = embed.getAttribute('src', false);
      if (src !== null) {
        extVideoId = SaveFrom_Utils.getMatchFirst(src, /dailymotion.com(?:\/swf)?\/video\/([\w\d]+)\??/);
        if(extVideoId && !prefs.lite) {
          // dailymotion

          parent = video.getPopupParent(embed, true);
          video.iframeParent = parent;

          video.extVideoId = extVideoId;
          video.appendButton('', '', video.style, {
            action: 'getDailymotionLinks',
            extVideoId: extVideoId
          });

          return true;
        }
      }

      var fv = embed.getAttribute('flashvars', false);
      if(!fv)
        return false;

      //fv = decodeURIComponent(fv);
      fv = SaveFrom_Utils.parseQuery(fv);

      var vid = {
        host: '',
        uid: 0,
        vtag: 0,
        vkid: '',
        hd: 0,
        hd_def: 0,
        no_flv: 0,
        md_title: ''
      };

      for(var i in vid)
      {
        if(fv[i])
          vid[i] = decodeURIComponent(fv[i]);
      }

      if(vid.hd > 0 && (!vid.hd_def || vid.hd > vid.hd_def))
        vid.hd_def = vid.hd;

      var links = videoLinks.getLinks(vid);
      if(links)
      {
        video.appendButton(links, vid.md_title, video.style);
      }

      return true;
    },


    getPopupParent: function(node, removeOldLinks)
    {
      var parent = SaveFrom_Utils.getParentByClass(node, 'wrap');
      if(!parent)
        parent = node.parentNode.parentNode;

      if(removeOldLinks)
      {
        node = parent.querySelector('.' + downloadLinkClassName);
        if(node)
          node.parentNode.removeChild(node);
      }

      return parent;
    },


    onVideoClick: function(event)
    {
      var node = event.target;
      if(node.tagName != 'A')
      {
        for(var parent = node; parent; parent = parent.parentNode)
        {
          if(parent.tagName == 'A')
          {
            node = parent;
            break;
          }
        }
      }

      if(node.tagName == 'A' && node.href && node.href.search(/\/video-?\d+_\d+/i) > -1)
      {
        clearInterval(video.popupTimer);
        setTimeout(function(){
          var node = document.getElementById('mv_layer_wrap');
          if(node)
          {
            video.catchPopup();
          }

        }, 1000);
      }
    },


    getLinksFromHtml5Video: function(parent)
    {
      if(!parent)
        return false;

      var v = parent.querySelector('video');
      if(!v)
        return false;

      var src = v.src;
      if(!src)
      {
        var source = video.querySelector('source[src]');
        if(source)
          src = source.getAttribute('src');
      }

      var m = src.match(/(https?:\/\/(?:[^\/]+\/)+)u(\d+)\/videos\/([\da-f]+)\.(\d{3,4})\.mp4/i);
      if(!m || m.length < 5)
        return false;

      var quality = ['240', '360', '480', '720', '1080'];

      var vid = {
        host: m[1],
        uid: m[2],
        vtag: m[3],
        vkid: '',
        hd: 0,
        hd_def: 0,
        no_flv: 1,
        md_title: ''
      };

      for(var i = quality.length - 1; i >= 0; i--)
      {
        if(m[4] == quality[i] ||
          document.getElementById('button' + quality[i]) ||
          parent.querySelector('button[val="' + quality[i] + 'p"]'))
        {
          vid.hd_def = i;
          break;
        }
      }

      var links = videoLinks.getLinks(vid);
      if(links)
      {
        video.appendButton(links, vid.md_title, video.style);
      }
    }
  };

  var videoFeed = {
    linkAttr: 'data-savefrom-hasBtn',
    lastLink: undefined,
    isShow: false,
    addDownloadBtn: function(link) {
      var btn_container = document.createElement('span');
      btn_container.addEventListener('click', function(e) {
        e.stopPropagation();
      }, false);
      var dl_link = document.createElement('a');
      var url = link.href;
      dl_link.href = 'http://savefrom.net/?url=' + encodeURIComponent(url);
      dl_link.setAttribute(SaveFrom_Utils.embedDownloader.dataAttr, url);
      dl_link.addEventListener('click', videoFeed.showPopup, false);

      SaveFrom_Utils.setStyle(dl_link, {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        marginLeft: '5px',
        backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#78A2CC')+')',
        backgroundRepeat: 'no-repeat',
        marginBottom: '-4px'
      });

      btn_container.appendChild(dl_link);
      link.appendChild(btn_container);
    },
    showPopup: function(e) {
      videoFeed.isShow = true;
      SaveFrom_Utils.embedDownloader.onClick(e);
      document.removeEventListener('click', videoFeed.hidePopup, true);
      document.addEventListener('click', videoFeed.hidePopup, true);
    },
    hidePopup: function(e) {
      if (videoFeed.isShow === false) {
        return;
      }
      if (e !== undefined) {
        SaveFrom_Utils.embedDownloader.onBodyClick(e);
      } else {
        SaveFrom_Utils.embedDownloader.hidePanel();
        SaveFrom_Utils.embedDownloader.lastLink = null;
      }
      videoFeed.isShow = SaveFrom_Utils.embedDownloader.lastLink !== null;
      if ( videoFeed.isShow === false ) {
        document.removeEventListener('click', videoFeed.hidePopup, true);
      }
    },
    onLinkHover: function(event)
    {
      var link = event.target;
      if(link.tagName !== 'A') {
        link = link.parentNode;
        if(link !== null && link.tagName !== 'A') {
          return;
        }
      }

      var href = link.href;
      var id = link.id;
      if (id.substr(0, 14) !== 'post_media_lnk' || href.indexOf('/video') === -1 ) {
        return;
      }

      if (videoFeed.lastLink === link) {
        link = link.parentNode;
        if(link !== null && link.tagName !== 'A') {
          return;
        }
      }
      videoFeed.lastLink = link;
      videoFeed.hidePopup();

      var hasBtn = link.getAttribute(videoFeed.linkAttr);
      if (hasBtn !== null) {
        return;
      }

      link.setAttribute(videoFeed.linkAttr, '1');

      videoFeed.addDownloadBtn(link);
    },
    run: function() {
      document.removeEventListener('mouseover', this.onLinkHover, true);
      document.addEventListener('mouseover', this.onLinkHover, true);
    }
  };

  //  /VIDEO
  ///////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////
  //  PHOTO

  var photo = {
    box: null,
    album: '',

    links: {},
    count: 0,
    found: 0,
    indicator: null,
    warning: null,
    warningTimer: null,
    offset: 0,
    offsetStep: 10,

    cache: {},


    init: function()
    {
      photo.box = null;
      photo.album = '';

      photo.links = {};
      photo.count = 0;
      photo.found = 0;
      photo.indicator = null;
      photo.warning = null;
      clearTimeout(photo.warningTimer);
      photo.offset = 0;
    },


    showLinks: function()
    {
      photo.init();

      if(window.location.href.search(/(\?|&|#)act=edit/i) > -1)
        return false;

      if(window.location.href.search(/\/(?:albums?|tag|photos)-?\d+(?:_\d+)?/i) == -1)
        return false;

      var id = window.location.href.match(/#\/(albums?|tag|photos)(-?\d+)(?:_(\d+))?/i);
      if(!id || id.length == 0)
        id = window.location.href.match(/\/(albums?|tag|photos)(-?\d+)(?:_(\d+))?/i);

      if(!id || id.length < 3)
        return false;

      if(id.length > 3 && id[3])
        photo.album = 'album' + id[2] + '_' + id[3];
      else
      {
        if(id[1] == 'albums')
          id[1] = 'photos';

        photo.album = id[1] + id[2];
      }

      var parent = document.getElementById('photos_albums_container');
      if(!parent)
        parent = document.getElementById('photos_container');

      if(!photo.album || !parent)
        return false;

      photo.box = document.createElement('div');
      photo.box.id = 'savefrom_vk_photo_box';
      photo.box.className = downloadLinkClassName;
      photo.box.style.margin = '10px 20px';
      parent.parentNode.insertBefore(photo.box, parent);
      photo.addDownloadAlbumBtn(chrome.i18n.getMessage('vkDownloadPhotoAlbum'));
      return true;
    },


    addDownloadAlbumBtn: function(value) {
      var parent = document.querySelector('.photos_album_page, .photos_albums_page, ' +
        '.photos_tag_page, #photos_albums');

      if(parent)
        parent = parent.querySelector('.summary_wrap .summary');

      if(parent)
      {
        var divide = document.createElement('span');
        divide.className = 'divide ' + downloadLinkClassName;
        divide.innerHTML = '|';
        parent.appendChild(divide);

        var btn = document.createElement('a');
        btn.href = '#';
        btn.className = downloadLinkClassName;
        btn.innerHTML = value;
        btn.style.fontWeight = 'bold';
        btn.addEventListener('click', function(event){
          event.stopPropagation();
          event.preventDefault();
          if(photo.box)
          {
            if(!photo.box.firstChild)
              photo.ajaxStart();
            else
            {
              if (photo.box.parentNode !== null
                && photo.box.parentNode.parentNode !== null
                && photo.box.parentNode.parentNode.id === 'photo_box_popup') {
                return;
              }
              if(photo.box.style.display == 'none')
                photo.box.style.display = '';
              else
                photo.box.style.display = 'none';
            }
          }
        }, false);

        return parent.appendChild(btn);
      }


      var clear_fix = document.createElement('div');
      clear_fix.className = 'clear_fix';

      var blue_box = document.createElement('div');
      blue_box.className = 'button_blue fl_l';

      var btn = document.createElement('button');
      btn.innerHTML = value;

      btn.onclick = function(){
        var node = this.parentNode.parentNode;
        node.parentNode.removeChild(node);
        photo.ajaxStart();
      };

      blue_box.appendChild(btn);
      clear_fix.appendChild(blue_box);

      return photo.box.appendChild(clear_fix);
    },


    getAlbumTitle: function()
    {
      var title = '';
      if(document.title)
      {
        title = document.title.replace(/\|[^\|]+$/, '');
        if(title)
          title = ' &quot;' + title + '&quot;';
      }

      return '<b>' + chrome.i18n.getMessage('vkDownloadPhotoAlbum') + title + '</b><br><br>';
    },



    ajaxStart: function()
    {
      var d = document.createElement('div');
      d.style.marginTop = '15px';
      photo.box = photo.box.appendChild(d);

      var warn = document.createElement('span');
      photo.warning = photo.box.appendChild(warn);

      var ind = document.createElement('img');
      ind.src = '//' + domain + '/images/upload.gif';
      ind.alt = '---';
      photo.indicator = photo.box.appendChild(ind);

      photo.getLinks(true);
    },

    warningUpdate: function() {
      if (!photo.warning) {
        return;
      }
      var count = photo.count - photo.found;
      clearTimeout(photo.warningTimer);
      if (count < 1) {
        photo.warning.parentNode.removeChild(photo.warning);
        photo.warning = null;
        return;
      }
      photo.warningTimer = setTimeout(function () {
        photo.warning.textContent = chrome.i18n.getMessage('vkNotAvailablePhotos').replace('%d', count);
      }, 500);
    },

    ajaxStop: function()
    {
      photo.offset = -1;
      photo.indicator.parentNode.removeChild(photo.indicator);

      photo.warningUpdate();

      if(!photo.found)
      {
        photo.box.appendChild(document.createTextNode(chrome.i18n.getMessage('vkFoundPhotos') + ': 0'));
        return;
      }

      photo.createLinkPanel();
    },


    getLinks: function(init)
    {
      if(photo.offset < 0) {
        photo.warningUpdate();
        return;
      }

      if(photo.count && photo.offset >= photo.count)
      {
        photo.offset = -1;
        return photo.ajaxStop();
      }

      var post = 'act=show&al=1&list=' + photo.album + '&offset=' + photo.offset;
      photo.offset += photo.offsetStep;

      var counterId = 'savefrom_vk_photo_found';

      photo.getLinksViaAPI(post, function(links, found, t){
        if(!links || typeof(links) != 'object')
        {
          return photo.ajaxStop();
        }

        for(var i in links)
        {
          if(!photo.links[links[i]])
          {
            photo.found++;
            photo.links[links[i]] = 1;
          }
        }

        if(init)
        {
          photo.count = SaveFrom_Utils.getMatchFirst(t,
            /\<!int>(\d+)/i);
          if(!photo.count)
            return photo.ajaxStop();

          var info = document.createElement('span');
          info.innerHTML = chrome.i18n.getMessage('vkFoundLinks') +
            ': <span id="' + counterId + '">0</span> ' +
            chrome.i18n.getMessage('vkFoundOf') + ' ' + photo.count;

          info.style.marginRight = '20px';
          photo.box.insertBefore(info, photo.box.firstChild);
        }

        var node = document.getElementById(counterId);
        if(node)
          node.innerText = photo.found;

        if(init)
        {
          if(photo.offset >= photo.count)
            return photo.ajaxStop();

          window.setTimeout(function(){
            photo.getLinks(false);
            photo.getLinks(false);
            photo.getLinks(false);
          }, 100);
        }
        else
        {
          window.setTimeout(function(){
            photo.getLinks(false);
          }, 100);
        }
      }, photo.ajaxStop);
    },


    getLinksViaAPI: function(query, onSuccess, onError)
    {
      var url = document.location.protocol + '//' + domain + '/al_photos.php';

      SaveFrom_Utils.sendRequest(url, function(r){
        if(!r.responseText)
          return onError();

        var t = r.responseText.replace(/\<!\>/g, '\n');
        var json = SaveFrom_Utils.getMatchFirst(t, /\<!json\>(.+?\}\s*\])/i);
        if(!json)
          return onError();

        json = JSON.parse(json);
        if(!json || !json.length)
          return onError();

        var found = 0, links = {};
        var src = ['w_src', 'z_src', 'y_src', 'x_src'];
        for(var i = 0; i < json.length; i++)
        {
          for(var j = 0; j < src.length; j++)
          {
            if(json[i][src[j]] && json[i]['id'])
            {
              if(!photo.cache[json[i][src[j]]])
              {
                found++;
                links[json[i]['id']] = json[i][src[j]];
                photo.cache[json[i]['id']] = json[i][src[j]];
              }

              break;
            }
          }
        }

        if(found < 1)
          return onError();

        onSuccess(links, found, t);
      }, '', '', query);
    },


    createLinkPanel: function()
    {
      var title = photo.getAlbumTitle();

      photo.box.appendChild(document.createElement('br'));
      photo.box.appendChild(document.createElement('br'));
      photo.box.appendChild(document.createTextNode(chrome.i18n.getMessage('vkShowAs') + ':'));

      var btn1 = createTextLink('javascript:void(0)', chrome.i18n.getMessage('vkListOfLinks'), false);
      SaveFrom_Utils.setStyle(btn1, {margin: '0 20px', fontWeight: 'bold'});
      btn1.onclick = function(){photo.showListOfLinks(title);};
      photo.box.appendChild(btn1);

      var btn2 = createTextLink('javascript:void(0)', chrome.i18n.getMessage('vkListOfPhotos'), false);
      SaveFrom_Utils.setStyle(btn2, {marginRight: '20px', fontWeight: 'bold'});
      btn2.onclick = function(){photo.showListOfPhotos(title);};
      photo.box.appendChild(btn2);
    },


    showListOfLinks: function(title, links, showListOfPhotosLink, callback)
    {
      var html = title + '<p>' + chrome.i18n.getMessage('vkListOfLinksInstruction') + '</p><br>';

      if(showListOfPhotosLink)
      {
        html += '<div><div style="float:left;">' +
          '<a href="#" class="sf__hidden" style="display:none;">' +
          chrome.i18n.getMessage('vkListOfPhotos') +
          '</a></div>' +
          '<div class="sf__info" style="float:right;"></div></div><br><br>';
      }
      else
      {
        html += '<br>';
      }

      html += '<textarea cols="60" rows="10" style="width:100%">';

      var oldLinks = photo.links;

      if(!links)
        links = photo.links;

      for(var i in links)
      {
        html += i + '\r\n';
      }
      html += '</textarea>';

      photo.links = oldLinks;

      setTimeout(function(){
        var popup = SaveFrom_Utils.popupDiv(html);
        if(popup && showListOfPhotosLink)
        {
          var a = popup.querySelector('a.sf__hidden');
          if(a)
          {
            a.addEventListener('click', function(event){
              photo.showListOfPhotos(title, links);
              event.preventDefault();
              return false;
            }, false);

            SaveFrom_Utils.setStyle(a, {
              display: 'block',
              fontWeight: 'bold',
              border: 'none',
              textDecoration: 'underline'
            });
          }
        }

        if(callback)
        {
          callback(popup, links);
        }
      }, 100);

      return false;
    },


    showListOfPhotos: function(title, links)
    {
      var html = '<html><head><style type="text/css">' +
        'a,img{display:block;margin-bottom:5px;}' +
        '</style></head><body>' + title +
        '<p style="width:640px">' +
        chrome.i18n.getMessage('vkListOfPhotosInstruction') +
        '</p><br><br>';

      var oldLinks = photo.links;

      if(!links)
        links = photo.links;

      for(var i in links)
      {
        var fileName = SaveFrom_Utils.getMatchFirst(i, /\/([\w\-]+\.[a-z0-9]{3,4})(?:\?|$)/i);
        if(fileName)
        {
          html += '<a href="' + i + '" download="' + fileName + '">' +
            '<img src="' + i + '" alt="photo"></a>';
        }
        else
          html += '<img src="' + i + '" alt="photo">';
      }

      html += '</body></html>';

      photo.links = oldLinks;

      window.open('data:text/html;charset=utf-8;base64,' +
        escape(SaveFrom_Utils.base64_encode(SaveFrom_Utils.utf8Encode(html))), '_blank');
      return false;
    }
  };


  var embedPhoto = {
    indicator: null,
    counterId: 'sf__embed_photo_counter',
    counter: 0,
    processId: 0,


    find: function(links)
    {
      var a = document.querySelectorAll('a[onclick]');
      var count = 0;

      for(var i = 0; i < a.length; i++)
      {
        var attr = a[i].getAttribute('onclick', false);
        if(attr && attr.search(/showPhoto\s*\(/i) >= 0)
        {
          var photoId = '', listId = '';
          var params = attr.match(/showPhoto\s*\(\s*[\"']([\d\-_]+)[\"']\s*,\s*[\"']([\w\-]+)[\"']/i);
          if(params && params.length > 2)
          {
            photoId = params[1];
            listId = params[2];
          }
          if(photoId)
          {
            var json = attr.match(/\{[\"']?temp[\"']?\s*:\s*(\{.+?\})/i);
            if(json)
            {
              json = json[1].replace(/(\{|,)\s*(\w+)\s*:/ig, '$1"$2":');
              var src = '';
              try
              {
                json = JSON.parse(json);

                if(!json.base)
                  json.base = '';

                var v = ['w_', 'z_', 'y_', 'x_'];
                for(var j = 0; j < v.length; j++)
                {
                  if(json[v[j]])
                  {
                    if(typeof json[v[j]] == 'object')
                      src = json.base + json[v[j]][0] + '.jpg';
                    else
                      src = json.base + json[v[j]] + '.jpg';

                    break;
                  }
                }
              }
              catch(err){}

              if(src && !links[photoId])
              {
                links[photoId] = {src: src, list: listId};
                count++;
              }
            }
          }
        }
      }

      return count;
    },

    createStatusPopup: function() {
      var id = 'photo_box_popup';

      var box_el = photo.box;
      if (box_el.id !== 'SaveFrom_vk_album') {
        box_el = SaveFrom_Utils.getParentByClass(box_el, downloadLinkClassName);
      }

      var parent_el = box_el.parentNode;
      if (parent_el.id === id) {
        return;
      }

      var next_node = box_el.nextElementSibling;
      SaveFrom_Utils.popupDiv('<div style="width: 400px;" id="'+id+'">', undefined, undefined, undefined, function() {
        parent_el.insertBefore(box_el, next_node);
        box_el.childNodes[0].style.display = 'none';
      });

      var popup_container = document.getElementById(id);
      if (!popup_container) {
        return;
      }

      popup_container.style.margin = '10px';
      popup_container.appendChild(box_el);
      if (!box_el.firstChild) {
        photo.ajaxStart();
      }

      if (box_el.childNodes[0] !== undefined) {
        box_el.childNodes[0].style.display = '';
      }
    },

    download: function()
    {
      var links = {}, count = embedPhoto.find(links);
      if(!count)
      {
        if (photo.box) {
          embedPhoto.createStatusPopup();
          return;
        }
        alert(chrome.i18n.getMessage('vkPhotoLinksNotFound'));
        return;
      }

      photo.showListOfLinks('', {}, true, function(popup, src){
        embedPhoto.getFullSizeSrc(popup, src, links, count, true);
      });
    },


    removeIndicator: function()
    {
      var node = embedPhoto.indicator;
      if(node && node.parentNode)
        node.parentNode.removeChild(node);

      embedPhoto.indicator = null;
    },


    initProgressInfo: function(popup, count)
    {
      embedPhoto.counter = 0;

      if(embedPhoto.indicator)
        embedPhoto.removeIndicator();

      var box = popup.querySelector('.sf__info');
      if(!box)
        return;

      var cnt = document.createElement('span');
      cnt.innerHTML = chrome.i18n.getMessage('vkFoundLinks') +
        ': <span id="' + embedPhoto.counterId + '">0</span> ' +
        chrome.i18n.getMessage('vkFoundOf') + ' ' + count;

      box.appendChild(cnt);

      var ind = document.createElement('img');
      ind.src = '//' + domain + '/images/upload.gif';
      ind.alt = '---';
      ind.style.marginLeft = '1em';
      embedPhoto.indicator = box.appendChild(ind);
    },


    updateProgress: function()
    {
      var node = document.getElementById(embedPhoto.counterId);
      if(node)
        node.textContent = embedPhoto.counter;
    },


    getFullSizeSrc: function(popup, src, links, count, init)
    {
      var ta = popup.querySelector('textarea');
      if(!ta)
        return embedPhoto.removeIndicator();

      if(init)
      {
        embedPhoto.processId++;
        embedPhoto.initProgressInfo(popup, count);
      }

      var found = false, value = '';
      for(var i in links)
      {
        if(photo.cache[i])
        {
          found = true;
          embedPhoto.counter++;
          delete links[i];
          src[photo.cache[i]] = 1;
          value += photo.cache[i] + '\r\n';
        }
      }

      embedPhoto.updateProgress();

      if(value)
        ta.value += value;

      if(!init && !found)
      {
        value = '';
        for(var i in links)
        {
          if(links[i].src)
          {
            embedPhoto.counter++;
            src[links[i].src] = 1;
            value += links[i].src + '\r\n';
            delete links[i];
          }
        }

        if(value)
          ta.value += value;

        embedPhoto.updateProgress();

        return embedPhoto.removeIndicator();
      }

      var query = null;

      if(!curModule)
        getModuleName();

      for(var i in links)
      {
        if(links[i].list)
        {
          query = 'act=show&al=1&list=' + links[i].list +
            '&module=' + curModule + '&photo=' + i;

          break;
        }
      }

      if(!query)
        return embedPhoto.removeIndicator();

      var processId = embedPhoto.processId;

      photo.getLinksViaAPI(query, function(l, found, t){
        setTimeout(function(){
          if(processId == embedPhoto.processId)
          {
            embedPhoto.getFullSizeSrc(popup, src, links, count, false);
          }
        }, 20);
      }, embedPhoto.removeIndicator);
    }
  };

  //  /PHOTO
  ///////////////////////////////////////////////////////////////////


  var pageLS = function() {
    var cb = undefined;
    return {
      init: function() {
        var script = document.createElement('script');
        var injectScript = function() {
          window.addEventListener('sf-storage-get', function(e) {
            var data = e.detail || e.data;
            var event = new CustomEvent('sf-storage-send', {detail: data+':'+(localStorage[data] || '')});
            window.dispatchEvent(event);
          });
        };
        script.textContent = '('+injectScript.toString()+')()';
        document.body.appendChild(script);

        window.addEventListener('sf-storage-send', function(e) {
          var data = e.detail || e.data;
          if (data) {
            data = data.substr(data.indexOf(':')+1);
            if (data === 'undefined' || data === 'null') {
              data = undefined;
            }
          }
          cb && cb(data);
          cb = undefined;
        });
      },
      get: function(key, _cb) {
        var event = new CustomEvent('sf-storage-get', {detail: key});
        cb = _cb;
        window.dispatchEvent(event);
      }
    }
  };

  function catchTitleChanging(event)
  {
    clearTimeout(titleTimer);
    titleTimer = setTimeout(function(){
      removeDownloadLinks();
      audio.showLinks();
      video.showLinks();
      photo.showLinks();
    }, 200);
  }

  var vk = {
    run: function()
    {
      autoFocusLoginForm();
      audio.showLinks();
      video.showLinks();
      photo.showLinks();
      videoFeed.run();
      pageLS = pageLS();
      pageLS.init();

      var current_url = document.URL;
      setInterval(function(){
        if (current_url != document.URL)
        {
          current_url = document.URL;
          catchTitleChanging();
        }
      }, 1000);
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response) {
    //console.log('vk', response);
    if (response.moduleEnable)
    {
      prefs = response;
      SaveFrom_Utils.runModule(response, vk);
    }
  });
};

_modules.youtube = function(){
  var iframe = false;

  if(window.top != window.self)
  {
    var m = location.href.match(/\/embed\/([\w\-]+)/i);

    if(m && m.length > 1)
    {
      iframe = true;
    }
    else
    {
      return;
    }
  }

  window.savefrom__lm = {};

  var moduleName = 'youtube',
      prefs = {};

  var youtube = {
    swfargs: null,
    token: '',
    video_id: '',
    sts: '',
    needDecipher: false,
    newInterface: false,

    panelId: 'savefrom__yt_links',
    buttonId: 'savefrom__yt_btn',
    panelParent: null,
    panelInsertBefore: null,
    timer: null,

    btnBox: null,
    links: null,

    run: function(vid, links)
    {
      youtube.links = links || null;

      if(iframe) {
        youtube.isVideoPage();
        youtube.video_id = youtube.swfargs.video_id;
        youtube.appendIframeButtons();
        return;
      }

      if(youtube.isVideoPage() || links)
      {
        if(vid)
          youtube.video_id = vid;

        var p = youtube.findPanel();
        if(p)
          youtube.appendDownloadButton(p);
      }

      if(!iframe)
      {
        window.clearInterval(youtube.timer);

        var loc = document.location.href;
        youtube.timer = window.setInterval(function(){
          if(document.location.href != loc)
          {
            loc = document.location.href;
            var vid = youtube.getIdFromLocation();
            if(!vid)
              return;

            youtube.links = null;

            chrome.extension.sendRequest({action: 'getYoutubeLinks', extVideoId: vid}, function(response){
              if(response.links)
                youtube.catchVideoChange(loc, vid, response.links);
            });
          }
        }, 1000);
      }
    },


    catchVideoChange: function(loc, vid, links)
    {
      var count = 0;

      var timer = setInterval(function() {
        if(loc != document.location.href)
        {
          window.clearInterval(timer);
          return;
        }

        if(!document.getElementById(youtube.buttonId) && !!youtube.findPanel())
        {
          window.clearInterval(timer);
          youtube.run(vid, links);
        }

        if(count > 20)
          window.clearInterval(timer);

        count++;
      }, 1000);
    },


    findPanel: function()
    {
      var p = document.getElementById('watch-headline-user-info');
      if(!p)
      {
        p = document.getElementById('watch7-subscription-container');
        if(p)
          youtube.newInterface = true;
      }

      if(!p)
      {
        var e = document.getElementById('watch-video-count');
        if(!e)
          e = document.getElementById('editSubscriptionDiv');

        if(e)
          p = e.parentNode;
      }

      if(p)
      {
        youtube.panelParent = p.parentNode;
        youtube.panelInsertBefore = SaveFrom_Utils.nextSibling(p);
        //youtube.appendDownloadButton(p);
      }

      return p;
    },


    getIdFromLocation: function(loc)
    {
      if(!loc)
        loc = document.location.href;

      var m = loc.match(/\/watch\?(?:.+&)?v=([\w\-]+)/i);
      if(m && m.length > 1)
        return m[1];

      return null;
    },


    isVideoPage: function()
    {
      var swfargs = youtube.getSwfArgs();
      if(!swfargs)
        return false;

      youtube.swfargs = swfargs;

      var token = swfargs.t ? swfargs.t : swfargs.token;
      if(!token)
        return false;

      youtube.token = token;

      var video_id = swfargs.video_id;
      if(!video_id)
        video_id = youtube.getIdFromLocation();

      if(!video_id)
        return false;

      youtube.video_id = video_id;

      youtube.sts = SaveFrom_Utils.getMatchFirst(document.body.innerHTML,
        /[\"']sts[\"']\s*:\s*[\"']?(\d+)/i);

      return true;
    },


    appendDownloadButton: function(parent)
    {
      if(document.getElementById(youtube.buttonId))
        return;

      var b = document.createElement('button');
      b.id = youtube.buttonId;
      b.className = 'yt-uix-button yt-uix-button-default';
      b.addEventListener('mousedown', youtube.getLinks, false);
      SaveFrom_Utils.setStyle(b, {
        marginLeft: '10px',
        fontSize: 'inherit',
        height: '24px'
      });

      var s = document.createElement('span');
      s.className = 'yt-uix-button-content';
      s.innerHTML = chrome.i18n.getMessage('download');
      s.style.fontWeight = 'bold';
      b.appendChild(s);

      var icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = SaveFrom_Utils.svg.getSrc('download', '#000000');
      SaveFrom_Utils.setStyle(icon, {
        width: '12px',
        height: '12px',
        verticalAlign: 'middle',
        marginLeft: '4px',
        position: 'relative',
        top: '-1px',
        cursor: 'pointer',
        opacity: 0.6
      });
      s.appendChild(icon);

      parent.appendChild(b);
    },


    updateWmode: function(p)
    {
      var e = p.querySelector('embed');
      if(!e) // html5
        return;

      // check wmode
      var m = e.getAttribute('wmode');
      if(m != 'opaque' && m != 'transparent')
      {
        // update wmode
        e.setAttribute('wmode', 'opaque');
        p.removeChild(e);
        p.appendChild(e);
      }
    },


    appendIframeButtons: function()
    {
      var p = document.getElementById('player'),
          b = document.createElement('div'),
          a = document.createElement('a'),
          panel = document.createElement('div');

      setTimeout(function() {
        youtube.updateWmode(p);
      }, 50);

      a.href = '#';
      a.textContent = chrome.i18n.getMessage('download').toLowerCase();
      SaveFrom_Utils.setStyle(a, {
        display: 'inline-block',
        color: 'rgba(255,255,255,.9)',
        textDecoration: 'none',
        padding: '5px 10px'
      });
      b.appendChild(a);

      SaveFrom_Utils.setStyle(b, {
        background: 'rgba(0, 0, 0, .4)',
        border: '1px solid rgba(255,255,255,.5)',
        borderRadius: '4px',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        lineHeight: 'normal',
        position: 'absolute',
        top: '30px',
        right: '5px',
        padding: 0,
        margin: 0,
        zIndex: 99999
      });

      panel.id = youtube.panelId;
      SaveFrom_Utils.setStyle(panel, {
        color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        border: 0,
        display: 'none',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        fontWeight: 'normal',
        lineHeight: 'normal',
        position: 'absolute',
        top: '25px',
        left: 0,
        right: 0,
        margin: 0,
        padding: '3px',
        zIndex: 99990
      });

      if(document.body.scrollWidth <= 400)
      {
        panel.style.paddingTop = '28px';
      }

      youtube.btnBox = document.createElement('div');
      youtube.btnBox.style.display = 'none';
      youtube.btnBox.appendChild(b);
      youtube.btnBox.appendChild(panel);

      document.removeEventListener('mouseover', youtube.onExtPlayerOver, false);
      document.removeEventListener('mouseout', youtube.onExtPlayerOver, false);
      document.addEventListener('mouseover', youtube.onExtPlayerOver, false);
      document.addEventListener('mouseout', youtube.onExtPlayerOver, false);

      a.addEventListener('click', youtube.fetchIframeLinks, false);
      a.addEventListener('click', youtube.toggleIframePanel, false);

      document.body.appendChild(youtube.btnBox);
    },


    fetchIframeLinks: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var button = e.target;

      var request = {
        action: 'getYoutubeLinks',
        extVideoId: youtube.video_id
      };

      chrome.extension.sendRequest(request, function(response){
        if(response.links)
        {
          youtube.appendIframeLinks(response.links, button);
        }
      });

      youtube.appendIframeLinks(chrome.i18n.getMessage('download') + ' ...', button);
    },


    appendIframeLinks: function(links, button)
    {
      var panel = document.getElementById(youtube.panelId);

      if(typeof(links) == 'object')
      {
        var title = youtube.getTitle(), titleAttr = '';
        if(title)
        {
          title = modifyTitle(title);
          titleAttr = '&title=' + encodeURIComponent(title);
          for(var i in links)
            links[i] += titleAttr;
        }

        panel.innerHTML = '';
        SaveFrom_Utils.video.yt.init(prefs);
        SaveFrom_Utils.video.yt.show(links, panel, prefs.moduleShowDownloadInfo, {
          link: {color: '#fff', borderBottom: '1px solid #808080',
            whiteSpace: 'nowrap', textDecoration: 'none'},
          text: {color: '#d0d0d0'},
          btn: {color: '#d0d0d0'},
          fsIcon: {color: '#ffffff', opacity: '.5'},
          fsText: {color: '#d0d0d0'}
        }, title);

        button.removeEventListener('click', youtube.fetchIframeLinks, false);
      }
      else if(typeof(links) == 'string')
      {
        panel.innerHTML = links;
      }
    },


    toggleIframePanel: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var panel = document.getElementById(youtube.panelId);
      if(panel)
      {
        panel.style.display = (panel.style.display == 'none') ? '' : 'none';
      }
    },


    onExtPlayerOver: function(event)
    {
      if(youtube.btnBox)
      {
        if(event.type == 'mouseover')
        {
          if(youtube.btnBox.style.display == 'none')
            youtube.btnBox.style.display = 'block';
        }
        else if(event.type == 'mouseout')
        {
          youtube.btnBox.style.display = 'none';
        }
      }
    },


    getTitle: function()
    {
      var t = document.getElementById('watch-headline-title');
      if(t)
        return t.innerText;

      var meta = document.getElementsByTagName('meta');
      for(var i = 0; i < meta.length; i++)
      {
        var name = meta[i].getAttribute('name', false);
        if(name && name.toLowerCase() == 'title')
          return meta[i].getAttribute('content', false);
      }

      if(iframe)
        return document.title.replace(/ - YouTube$/, '');

      return '';
    },


    getSwfArgs: function()
    {
      var html = document.body.innerHTML;

      var t = html.match(/[\"\'](?:swf_)?args[\"\']\s*:\s*(\{[^\}]+\})/i);
      if(t && t.length > 1)
      {
        if(t[1].search(/:\s*\"[^\"]+\s*\}$/) > -1)
          t[1] = t[1].replace(/\s*\}$/i, '"}');

        try
        {
          return JSON.parse(t[1]);
        }
        catch(err){
          t = html.match(/ytplayer.config\s*=\s*(\{.*?\});?<\/script>/i);
          if(t && t.length > 1) {
            try
            {
              return JSON.parse(t[1]);
            }
            catch(err){}
          }
        }
      }
      else
      {
        t = html.match(/flashvars\s*=\s*\\?[\"']?([^\"']+)/i);
        if(t && t.length > 1)
        {
          t = t[1];
          if(t.indexOf(/&/) == -1)
            t = t.replace(/(?:\\u0026|%26|%2526|&)amp;/ig, '&');

          t = SaveFrom_Utils.parseQuery(t);
          for(var i in t)
            t[i] = decodeURIComponent(t[i]);

          return t;
        }
      }

      var e = document.getElementsByTagName('embed');
      for(var i = 0; i < e.length; i++)
      {
        var f = e[i].getAttribute('flashvars', false);
        if(f && f.search(/fmt_map=/i) != -1)
        {
          return SaveFrom_Utils.parseQuery(f);
        }
      }

      return null;
    },


    getDownloadLink: function (video_id, token, fmt)
    {
      return 'http://' + location.host + '/get_video?video_id=' + video_id + '&t=' + token + '&fmt=' + fmt + '&asv=';
    },


    showLinks: function(links, button) {
      var button = document.getElementById(youtube.buttonId);

      if (typeof links === 'string') {
        SaveFrom_Utils.popupMenu.create({
          links: links,
          button: button,
          popupId: youtube.panelId,
          document: document,
          sfUtils: SaveFrom_Utils
        });
      } else {

        var title = youtube.getTitle();
        if(title) {
          title = modifyTitle(title);
        }

        var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(links, title, SaveFrom_Utils);

        SaveFrom_Utils.popupMenu.create({
          links: menuLinks,
          button: button,
          popupId: youtube.panelId,
          document: document,
          sfUtils: SaveFrom_Utils,
          showFileSize: true
        });
      }

      SaveFrom_Utils.addClass(button, 'yt-uix-button-toggled');

      button.removeEventListener('mousedown', youtube.getLinks, false);
      button.removeEventListener('mousedown', youtube.togglePanel, false);
      button.addEventListener('mousedown', youtube.togglePanel, false);

      document.removeEventListener('mousedown', youtube.closePopup, false);
      document.addEventListener('mousedown', youtube.closePopup, false);
    },

    closePopup: function () {
      var event = new CustomEvent('mousedown');
      youtube.togglePanel(event);
      document.removeEventListener('mousedown', youtube.closePopup);
    },

    togglePanel: function(event)
    {
      var button = document.getElementById(youtube.buttonId);

      event.preventDefault();
      event.stopPropagation();

      var e = document.getElementById(youtube.panelId);
      if(e)
      {
        if(e.style.display == 'none')
        {
          e.style.display = '';
          SaveFrom_Utils.addClass(button, 'yt-uix-button-toggled');

          document.addEventListener('mousedown', youtube.closePopup, false);
        }
        else
        {
          e.style.display = 'none';
          SaveFrom_Utils.removeClass(button, 'yt-uix-button-toggled');

          document.removeEventListener('mousedown', youtube.closePopup, false);
        }
      }
    },


    signatureDecipher: function(sig, sts)
    {
      if(!sts)
        return sig;

      function swap(a, b)
      {
        var t = a[0];
        a[0] = a[b % a.length];
        a[b] = t;
      }

      if(sts == '15917')
      {
        var s = sig.split('');
        s = s.reverse();
        s = s.slice(2);
        swap(s, 65);
        s = s.reverse();
        return s.join('');
      }

      if(sts == '15956')
      {
        var s = sig.split('');
        swap(s, 43);
        swap(s, 2);
        swap(s, 54);
        s = s.reverse();
        swap(s, 8);
        s = s.slice(1);
        return s.join('');
      }

      youtube.needDecipher = true;
      return sig;
    },


    getDashQuery: function()
    {
      if(!youtube.swfargs || !youtube.swfargs.dashmpd)
        return '';

      var u = youtube.swfargs.dashmpd.replace(/^.+\/api\/manifest\/dash\//i, '');
      if(u == youtube.swfargs.dashmpd)
        return '';

      u = u.split('/');
      if(!u || u.length < 2)
        return '';

      var query = {};
      for(var i = 0; i < u.length - 1; i += 2)
      {
        if(u[i] != 'itag')
        {
          u[i] = decodeURIComponent(u[i]);
          u[i + 1] = decodeURIComponent(u[i + 1]);

          if(u[i] == 's')
          {
            u[i] = 'signature';
            u[i + 1] = youtube.signatureDecipher(u[i + 1], youtube.sts);
          }
          else if(u[i] == 'sig')
          {
            u[i] = 'signature';
          }
          else if(u[i] == 'sparams' && u[i + 1].search(/(^|,|%2C)itag(^|,|%2C)/i))
          {
            return '';
          }

          query[u[i]] = u[i + 1];
        }
      }

      if(!query.signature)
        return '';

      query.ratebypass = 'yes';
      return SaveFrom_Utils.getQueryString(query);
    },


    getLinks: function(event)
    {
      event.preventDefault();
      event.stopPropagation();

      var button = event.target;

      var d = button;
      while(d && d != document.body)
      {
        if(d.style.display == 'none')
          d.style.display = '';

        if(d.style.visibility == 'hidden')
          d.style.visibility = 'visible';

        d.style.zOrder = '9999';

        d = d.parentNode;
      }

      if(youtube.links)
      {
        youtube.showLinks(youtube.links, button);
        return;
      }

      if(!youtube.swfargs || !youtube.token || !youtube.video_id)
        return;

      var links = youtube.parseFmtMap(youtube.swfargs.fmt_url_map || youtube.swfargs.url_encoded_fmt_stream_map);
      if(youtube.swfargs.adaptive_fmts)
      {
        var adaptive_links = youtube.parseFmtMap(youtube.swfargs.adaptive_fmts);
        for (var i in adaptive_links) {
          if(!links[i])
            links[i] = adaptive_links[i];
        }
      }

      if(youtube.needDecipher)
      {
        var request = {
          action: 'getYoutubeLinks',
          extVideoId: youtube.video_id
        };

        chrome.extension.sendRequest(request, function(response){
          if(response.links)
          {
            youtube.showLinks(response.links, button);
          }
          else
          {
            youtube.showLinks(links, button);
          }
        });

        youtube.showLinks(chrome.i18n.getMessage('download') +
          ' ...', button);

        return;
      }

      youtube.getDashLinks(links, youtube.swfargs.dashmpd, function(_links) {
        if (_links) {
          links = _links;
        }
        youtube.showLinks(links, button);
      });
    },


    parseFmtMap: function(u)
    {
      if(!u)
        return;

      var l = {}, baseUrl = '';
      if(u.search(/url=http/i) > -1)
      {
        u = u.split(',');
        for(var i = 0; i < u.length; ++i)
        {
          u[i] = u[i].replace(/\\u0026/ig, '&').replace(/\\\//g, '/');

          var q = SaveFrom_Utils.parseQuery(u[i]);
          if(q.url)
          {
            q.url = decodeURIComponent(q.url);
            if(q.url.search(/(\?|&)sig(nature)?=/i) == -1)
            {
              if(q.sig)
                q.url += '&signature=' + q.sig;
              else if(q.signature)
                q.url += '&signature=' + q.signature;
              else if(q.s)
                q.url += '&signature=' + youtube.signatureDecipher(q.s, youtube.sts);
            }

            if(q.url.search(/(\?|&)itag=/i) == -1)
            {
              if(q.itag)
                q.url += '&itag=' + q.itag;
            }

            var fmt = q.url.match(/(?:\?|&)itag=(\d+)/i);
            if(fmt && fmt.length > 1)
            {
              q.url = q.url.replace(/(\?|&)sig=/i, '$1signature=').
                replace(/\\u0026/ig, '&').replace(/\\\//g, '/');

              l[fmt[1]] = q.url;

              if(!baseUrl)
                baseUrl = SaveFrom_Utils.getMatchFirst(q.url, /^(https?:\/\/[^\?]+\?)/);
            }
          }
        }
      }
      else
      {
        u = decodeURIComponent(u);
        u = u.replace(/\\u0026/ig, '&').replace(/\\\//g, '/');
        u = u.replace(/,(\d+)\|/g, "\n$1|");
        u = u.split('\n');

        if(u && u.length > 0)
        {
          for(var i = 0; i < u.length; i++)
          {
            var t = u[i].split('|');
            if(t && t.length == 2)
            {
              l[t[0]] = t[1];
            }
          }
        }
      }

      // Deprecated
      // youtube.findAvailableLinks(baseUrl, l);

      return l;
    },


    findAvailableLinks: function(baseUrl, links)
    {
      if(!baseUrl)
        return;

      var dashQuery = youtube.getDashQuery();
      if(!dashQuery)
        return;

      var itags = youtube.getAdaptiveFtmItags();
      if(!itags)
        return;

      var map = {
        '133': ['5'], // 240
        '134': ['34', '18', '43'], // 360
        '135': ['35', '44'], // 480
        '136': ['22', '45'], // 720
        '137': ['37', '46'], // 1080
        '138': ['38'] // 4k
      };

      for(var i = 0; i < itags.length; i++)
      {
        if(map[itags[i]])
        {
          for(var j = 0; j < map[itags[i]].length; j++)
          {
            var itag = map[itags[i]][j];
            if(!links[itag])
            {
              links[itag] = baseUrl + dashQuery + '&itag=' + itag;
            }
          }
        }
      }
    },


    getAdaptiveFtmItags: function()
    {
      var u = youtube.swfargs.adaptive_fmts;
      if(!u)
        return;

      var itags = [];

      u = u.split(',');
      for(var i = 0; i < u.length; ++i)
      {
        var q = SaveFrom_Utils.parseQuery(u[i]);
        var itag = 0;

        if(q.url)
        {
          q.url = decodeURIComponent(q.url);
          itag = SaveFrom_Utils.getMatchFirst(q.url, /(?:\?|&)itag=(\d+)/i);
        }

        if(!itag && q.itag)
          itag = q.itag;

        if(itag)
          itags.push(itag);
      }

      return itags;
    },

    getDashLinks: (function() {
      var parseDash = function(xml, links, cb) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xml,"text/xml");
        var elList = xmlDoc.querySelectorAll('Representation');

        if (!links) {
          links = {};
        }

        for (var i = 0, el; el = elList[i]; i++) {
          var itag = el.id;
          if (links[itag] !== undefined) {
            continue;
          }
          var baseurl = el.querySelector('BaseURL');
          if (baseurl === null) {
            continue;
          }
          var url = baseurl.textContent;
          links[itag] = url;
        }

        cb(links);
      };

      var _getDashLinks = function(links, dashmpd, cb) {
        if (!dashmpd) {
          return cb();
        }

        var signature_pos = dashmpd.indexOf('signature');
        if (signature_pos === -1) {
          var s_pos = dashmpd.indexOf('/s/');
          if (s_pos === -1) {
            return cb();
          }
          s_pos += 3;
          var s_end = dashmpd.indexOf('/', s_pos);
          if (s_end === -1) {
            s_end = dashmpd.length;
          }
          var s = dashmpd.substr( s_pos, s_end - s_pos );
          var signature = youtube.signatureDecipher(s, youtube.sts);
          if (signature === s) {
            return cb();
          }
          dashmpd = dashmpd.substr(0, s_pos - 2) + 'signature/' + signature + dashmpd.substr(s_end);
        }

        SaveFrom_Utils.sendRequest(dashmpd, function(r) {
          if(r.status !== 200) {
            return cb();
          }
          parseDash(r.responseText, links, cb);
        });
      };

      return _getDashLinks;
    })()
  };


  function modifyTitle(t)
  {
    t = t.replace(/[\x2F\x5C\x3A\x7C]/g, '-');
    t = t.replace(/[\x2A\x3F]/g, '');
    t = t.replace(/\x22/g, '\'');
    t = t.replace(/\x3C/g, '(');
    t = t.replace(/\x3E/g, ')');
    t = t.replace(/(?:^\s+)|(?:\s+$)/g, '');
    return t;
  }


  SaveFrom_Utils.initModule(moduleName, function(response){
    //console.log('youtube', response);
    if(response.lite)
      return;

    prefs = response;
    SaveFrom_Utils.runModule(response, youtube);
  });
};

_modules.lm = function(){
  if(window.top != window.self)
    return;

  var moduleName = 'lm',
      prefs = {};

  chrome.extension.onRequest.addListener(function(request, sender, callback){
    switch(request.action){
      case 'updateLinks':
        lm.run();
        break;
    }
  });

  var lm = {
    htmlAfter: '',

    linkText: '',

    linkStyle: {
      'border': 'none',
      'textDecoration': 'none',
      'padding': '0',
      'position': 'relative'
    },

    imgStyle: {
      'border': 'none',
      'width': 'auto',
      'height': 'auto'
    },

    buttonSrc: 'data:image/gif;base64,R0lGODlhEAAQAOZ3APf39+Xl5fT09OPj4/Hx8evr6/3+/u7u7uDh4OPi497e3t7e3/z8/P79/X3GbuXl5ubl5eHg4WzFUfb39+Pj4lzGOV7LOPz7+/n6+vn5+ZTLj9/e387Ozt7f3/7+/vv7/ISbePn5+m/JV1nRKXmVbkCnKVrSLDqsCuDh4d/e3uDn3/z7/H6TdVeaV1uSW+bn5v39/eXm5eXm5kyHP/f39pzGmVy7J3yRd9/f3mLEKkXCHJbka2TVM5vaZn6Wdfn6+YG/c/r5+ZO/jeLi41aHTIeageLn4f39/vr6+kzNG2PVM5i+lomdf2CXYKHVmtzo2YXNeDqsBebl5uHh4HDKWN3g3kKqEH6WeZHTXIPKdnSPbv79/pfmbE7PHpe1l4O8dTO5DODg4VDLIlKUUtzo2J7SmEWsLlG4NJbFjkrJHP7+/VK5Nfz8+zmnC3KKa+Hg4OHh4Y63j/3+/eDg4Ojo6P///8DAwP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAHcALAAAAAAQABAAAAfWgHd2g4SFhYJzdYqLjIpzgx5bBgYwHg1Hk2oNDXKDFwwfDF5NLmMtcStsn4MhGT8YS04aGmU1QRhIGYMTADQAQlAODlloAMYTgwICRmRfVBISIkBPKsqDBAREZmcVFhYVayUz2IMHB1dWOmImI2lgUVrmgwUFLzdtXTxKSSduMfSD6Aik48MGlx05SAykM0gKhAAPAhTB0oNFABkPHg5KMIBCxzlMQFQZMGBIggSDpsCJgGDOmzkIUCAIM2dOhEEcNijQuQDHgg4KOqRYwMGOIENIB90JBAA7',

    sfref: '&utm_source={helper}&utm_medium=extensions&utm_campaign=link_modifier',

    pageUrl: 'http://savefrom.net/',
    anchorAttribute: 'savefrom_lm',
    anchorIndexAttribute: 'savefrom_lm_index',

    linkRegExp: null,

    savefromLinkCount: 0,

    re: {
      filehosting: {
        'rapidshare.com': [/^https?:\/\/([\w\-]+\.)?rapidshare\.com\/\#\!download\|\d+\|\d+\|[^\s\"\|]+\|\d+/i, /^https?:\/\/(rs\d+\.|www\.)?rapidshare\.com\/files\/\d+\/.+/i],
        'filefactory.com': [/^http:\/\/(www\.)?filefactory\.com\/file\/[a-z0-9]+\/?/i],
        'sendspace.com': [/^http:\/\/(www\.)?sendspace\.com\/file\/\w+/i]
      },

      mediahosting: {
        'youtube.com': [
          /^https?:\/\/([a-z]+\.)?youtube\.com\/(#!?\/)?watch\?.*v=/i,
          /^https?:\/\/([a-z0-9]+\.)?youtube\.com\/(embed|v)\/[\w\-]+/i
        ],
        'youtu.be': [/^https?:\/\/([a-z]+\.)?youtu\.be\/[\w\-]+/i],
        'google.com': [/^http:\/\/video\.google\.com\/videoplay\?.*docid=/i],
        'metacafe.com': [/^http:\/\/(www\.)?metacafe\.com\/watch\/\d+\/[^\/]+\/?/i],
        'break.com': [/^http:\/\/(www\.)?break\.com\/(index|movies\w*|(\w+\-)+\w+)\/.+\.html$/i, /^http:\/\/view\.break\.com\/\d+/i],
        'vimeo.com': [/^http:\/\/([\w\-]+\.)?vimeo\.com\/\d+$/i],
        'sevenload.com': [/^http:\/\/([\w\-]+\.)?sevenload\.com\/videos\/[\w\-\+\/=]+/i, /^http:\/\/([\w\-]+\.)?sevenload\.com\/shows\/.+/i],
        'facebook.com': [/^https?:\/\/(?:www\.)facebook\.com\/([^\/]+\/)*video\.php\?([^&]+&)*v=\d+/i],
        //'rutube.ru': [/^http:\/\/rutube\.ru\/tracks\/\d+\.html\?.*v=[a-f0-9]+/i],
        'mail.ru': [/^http:\/\/([a-z0-9_-]+\.)?video\.mail\.ru\/(.+\/)+\d+\.html/i, /^http:\/\/r\.mail\.ru\/\w+\/video\.mail\.ru\/(.+\/)+\d+\.html/i],
        'yandex.ru': [/^http:\/\/video\.yandex\.ru\/users\/[\w\-,!\+]+\/view\/[\w\-,!\+]+\/?/i],
        'rambler.ru': [/^http:\/\/vision\.rambler\.ru\/users\/[^\/\s]+\/\d+\/[\w\-_\+!]+\/?/i],
        'smotri.com': [/^http:\/\/([a-z0-9_-]+\.)?smotri\.com\/video\/view\/\?.*id=v[0-9a-f]/i],
        'tvigle.ru': [/^http:\/\/(www\.)?tvigle\.ru\/channel\/\d+\?.*vid_id=\d+/i, /^http:\/\/(www\.)tvigle\.ru\/prg\/\d+\/\d+/i],
        'intv.ru': [/^http:\/\/(www\.)?intv\.ru\/(view|quickdl)\/\?.*film_id=\w+/i, /^http:\/\/(www\.)?intv\.ru\/v\/\w+/i],
        'yasee.ru': [/^http:\/\/([a-z0-9_-]+\.)?yasee\.ru\/video\/view\/\?.*id=v[0-9a-f]/i],
        'narod.tv': [/^http:\/\/(?:www\.)?narod\.tv\/\?.*vid=/i],
        'vkadre.ru': [/^http:\/\/(www\.)?vkadre\.ru\/videos\/\d+/i],
        'myvi.ru': [
          /^http:\/\/(www\.)?myvi\.ru\/([a-z][a-z]\/)?videodetail\.aspx\?.*video=/i,
          /^http:\/\/(www|kino|anime)\.myvi\.ru\/watch\/[\w\-]+/i
        ],
        '1tv.ru': [/^http:\/\/(www\.)?1tv\.ru(\:\d+)?\/newsvideo\/\d+/i, /^http:\/\/(www\.)?1tv\.ru(\:\d+)?\/news\/\w+\d+/i],
        'ntv.ru': [/^http:\/\/news\.ntv\.ru\/(\w+\/)?\d+\/video\/?/i],
        'vesti.ru': [/^http:\/\/(www\.)?vesti\.ru\/videos\?.*vid=\d+/i],
        'bibigon.ru': [/^http:\/\/(www\.)?bibigon\.ru\/videow\.html\?id=\d+/i, /^http:\/\/(www\.)?bibigon\.ru\/video\.html\?vid=\d+/i],
        'mreporter.ru': [/^http:\/\/(www\.)?mreporter\.ru\/reportermessages\!viewreport\.do[^\?]*\?.*reportid=\d+/i],
        'autoplustv.ru': [/^http:\/\/(www\.)?autoplustv\.ru\/494\/\?id=\d+/i],
        'russia.ru': [/^http:\/\/([\w\-]+\.)?russia\.ru\/video\/?/i],
        'amik.ru': [/^http:\/\/(www\.)?amik\.ru\/video\/vid\d+\.html/i, /^http:\/\/(www\.)?amik\.ru\/video\/vcid\d+\.html/i],
        'life.ru': [/^http:\/\/([\w+\-]+\.)?life\.ru\/video\/\d+/i]
      }
    },


    parseHref: function(href, search)
    {
      var res = new Array();
      res.push(href);

      var i = href.toLowerCase().indexOf('http://', 7);
      if(i > 7)
      {
        res.push(href.substring(i));
      }
      else if(search)
      {
        var h = search.match(/http%3a(%2f%2f|\/\/)[^\s\&\"\<\>]+/i);
        if(h && h.length > 0)
        {
          res.push(decodeURIComponent(h[0]));
        }
        else
        {
          var s = '';
          try
          {
            s = decodeURIComponent(search);
          }
          catch(err)
          {
          }

          if(s)
          {
            h = s.match(/((?:aHR0cDovL|aHR0cHM6Ly)[a-z0-9+\/=]+)/i);
            if(h && h.length > 1)
            {
              h = base64.decode(h[1]);
              if(h.search(/^https?:\/\//i) != -1)
                res.push(decodeURIComponent(h));
            }
          }
        }
      }

      return res;
    },


    href: function(a)
    {
      return a.getAttribute('href', false);
    },


    getElementIndex: function(e)
    {
      var html = e.innerHTML;
      if(!html || html == ' ')
        return 1;

      var bg = e.style.backgroundImage;
      if(bg && bg != 'none')
        return 1;

      var c = e.getElementsByTagName('*');
      for(var i = 0; i < c.length; i++)
      {
        if(c[i].tagName == 'IMG')
          return 2;
        else
        {
          bg = c[i].style.backgroundImage;
          if(bg && bg != 'none')
            return 1;
        }
      }

      return 0;
    },


    run: function()
    {
      SaveFrom_Utils.embedDownloader.init();

      lm.sfref = lm.sfref.replace('{helper}', prefs.helper);

      var prefFileHosting = (prefs.lmFileHosting == '0') ? false : true;
      var prefMediaHosting = (prefs.lmMediaHosting == '0') ? false : true;

      if(!prefFileHosting && !prefMediaHosting)
        return;

      lm.linkRegExp = {};
      if(prefFileHosting)
      {
        for(var i in lm.re.filehosting)
          lm.linkRegExp[i] = lm.re.filehosting[i];
      }

      if(prefMediaHosting)
      {
        for(var i in lm.re.mediahosting)
          lm.linkRegExp[i] = lm.re.mediahosting[i];
      }


      var a = document.getElementsByTagName('a');
      if(lm.savefromLinkCount != a.length)
      {
        lm.savefromLinkCount = a.length;

        var found = {}, lastHref = '';

        for(var i = 0; i < a.length; i++)
        {
          var href = handleAnchor(a[i]);
          if(href)
          {
            var index = 0;
            var attr = a[i].getAttribute(lm.anchorIndexAttribute, false);
            if(attr === 0 || attr)
              index = parseInt(attr);
            else
            {
              index = lm.getElementIndex(a[i]);
              a[i].setAttribute(lm.anchorIndexAttribute, index, false);
            }

            if(found[href])
            {
              if(index < found[href].index)
              {
                found[href].elements = [a[i]];
                found[href].index = index;
                lastHref = href;
              }
              else if(index == found[href].index && href != lastHref)
              {
                found[href].elements.push(a[i]);
                lastHref = href;
              }
            }
            else
            {
              found[href] = {
                index: index,
                elements: [a[i]]
              };

              lastHref = href;
            }
          }
        }

        var count = 0;
        for(var i in found)
        {
          for(var j = 0; j < found[i].elements.length; j++)
          {
            var e = found[i].elements[j];
            count++;
            if(!e.getAttribute(lm.anchorAttribute, false))
              modifyLink(e, i);
          }
        }
      }



      function checkLink(link, domain)
      {
        if(!link)
          return false;

        if(link == window.location.href)
          return false;

        domain = SaveFrom_Utils.getTopLevelDomain(domain);
        if(!domain || !lm.linkRegExp[domain])
          return false;

        for(var i = 0; i < lm.linkRegExp[domain].length; i++)
        {
          if(link.search(lm.linkRegExp[domain][i]) != -1)
            return true;
        }

        return false;
      }


      function handleAnchor(obj)
      {
        var href = obj.href;
        if(href && (href.search(/^https?:\/\/([\w\-]+\.)?savefrom\.net\//i) == -1))
        {
          var hrefArray = lm.parseHref(href, obj.search);

          if(hrefArray.length > 0)
          {
            if(lm.href(obj).indexOf('#') != 0 && checkLink(hrefArray[0], obj.hostname))
            {
              return hrefArray[0];
            }
            else if(hrefArray.length > 1)
            {
              for(var j = 1; j < hrefArray.length; j++)
              {
                var aTemp = document.createElement('a');
                aTemp.href = hrefArray[j];
                if(lm.href(aTemp).indexOf('#') != 0 && checkLink(hrefArray[j], aTemp.hostname))
                {
                  return hrefArray[j];
                }
              }
            }
          }
        }

        return '';
      }

      function modifyLink(obj, link)
      {
        if(!obj)
          return;

        obj.setAttribute(lm.anchorAttribute, '1', false);

        var box = document.createElement('span');
        box.setAttribute('style', 'padding: 0; margin: 0; margin-left: 5px;', false);
        box.addEventListener('click', function(e) {
          e.stopPropagation();
        });

        var parent = obj.parentNode;
        if(!parent)
          return;

        try
        {
          link = encodeURIComponent(link);
        }
        catch(err)
        {
          return;
        }

        var href = lm.pageUrl + '?url=' + link;
        if(lm.sfref)
          href += lm.sfref;

        // add button
        var a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.title = chrome.i18n.getMessage('lmButtonTitle');

        a.style.backgroundImage = 'url('+lm.buttonSrc+')';
        a.style.backgroundRepeat = 'no-repeat';
        a.style.width = '16px';
        a.style.height = '16px';
        a.style.display = 'inline-block';

        for(var i in lm.linkStyle)
          a.style[i] = lm.linkStyle[i];

        if (obj.style.zIndex) {
          a.style.zIndex = obj.style.zIndex;
        }

        a.setAttribute(lm.anchorAttribute, '1', false);
        if(lm.linkText)
        {
          a.innerHTML = lm.linkText;
        }

        box.appendChild(a);

        if(lm.htmlAfter)
          box.innerHTML += lm.htmlAfter;


        if(obj.nextSibling)
          parent.insertBefore(box, obj.nextSibling);
        else
          parent.appendChild(box);
      }
    }
  };



  // Base64
  var base64 = {
    key: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    decode: function(text)
    {
      var res = '';
      var c1, c2, c3, e1, e2, e3, e4;
      var i = 0;

      text = text.replace(/[^A-Za-z0-9\+\/\=]/g, '');

      while(i < text.length)
      {
        e1 = base64.key.indexOf(text.charAt(i++));
        e2 = base64.key.indexOf(text.charAt(i++));
        e3 = base64.key.indexOf(text.charAt(i++));
        e4 = base64.key.indexOf(text.charAt(i++));

        c1 = (e1 << 2) | (e2 >> 4);
        c2 = ((e2 & 15) << 4) | (e3 >> 2);
        c3 = ((e3 & 3) << 6) | e4;

        res += String.fromCharCode(c1);

        if(e3 != 64)
          res += String.fromCharCode(c2);
        if(e4 != 64)
          res += String.fromCharCode(c3);
      }

      return res;
    }
  };


  SaveFrom_Utils.initModule(moduleName, function(response){
    if (response && response.moduleEnable)
    {
      prefs = response;
      prefs.lmFileHosting = prefs.lmFileHosting || '1';
      prefs.lmMediaHosting = prefs.lmMediaHosting || '1';

      SaveFrom_Utils.runModule(response, lm);

      window.addEventListener('load', function(event){
        lm.run();
        window.removeEventListener('load', arguments.callee, false);
      }, false);
    }
  });
};


/////////////////////////////////////////////////
// LOCALES

chrome.i18n.messages.de = {
 "extName": {"message": "SaveFrom.net Helfer"},
 "extDescription": {"message": "Laden Sie von YouTube, RapidShare, VK.com und mehr als 40 anderen Seiten mit einem Klick herunter."},

 "extNameLite": {"message": "SaveFrom.net Helfer Lite"},
 "extDescriptionLite": {"message": "Herunterladen von RapidShare, VK.com und mehr als 40 weiteren Seiten mit einem Klick herunter."},

 "lang": {"message": "de"},

 "titleDefault": {"message": "SaveFrom.net Helfer"},
 "titleDesabled": {"message": "SaveFrom.net Helfer deaktiviert"},

 "menuEnable": {"message": "Aktivieren"},
 "menuDisable": {"message": "Deaktivieren"},

 "download": {"message": "Herunterladen"},
 "downloadTitle": {"message": "Klicken Sie den Link während Sie die Alt/Einstellung oder Ctrl/Strg Taste drücken zum Herunterladen der Dateien."},
 "noLinksFound": {"message": "Keine Links wurden gefunden"},
 "more": {"message": "Mehr"},
 "close": {"message": "Schließen"},
 "kbps": {"message": "kbps"},
 "withoutAudio": {"message": "without audio"},

 "subtitles": {"message": "Untertitel"},
 "playlist": {"message": "Wiedergabliste"},
 "filelist": {"message": "List of files"},
 "downloadWholePlaylist": {"message": "Die komplette Wiedergabliste herunterladen"},

 "getFileSizeTitle": {"message": "Dateigröße bestimmen" },
 "getFileSizeFailTitle": {"message": "Fehler bei bestimmung der Dateigröße. Bitte versuchen Sie es erneut."},

 "lmButtonTitle": {"message": "Holen Sie sich einen direkten Link."},

 "downloadFromCurrentPage": {"message": "Download von der aktuellen Seite"},
 "updateLinks": {"message": "Download-Links Aktualisieren"},
 "updateLinksNotification": {"message": "Links updated"},
 "downloadMP3Files": {"message": "Alle MP3 Dateien herunterladen"},
 "downloadPlaylist": {"message": "MP3 Playlist herunterladen"},
 "downloadPhotos": {"message": "Download all photos"},
 "installFullVersion": {"message": "Install full version"},
 "disable": {"message": "Deaktivieren"},
 "showOptions": {"message": "Options"},
 "reportBug": {"message": "Report a bug"},

 "aboutPage": {"message": "Über"},
 "aboutTitle": {"message": "SaveFrom.net Helfer"},
 "aboutVersion": {"message": "Version"},
 "aboutDescription": {"message": "Hilft den Nutzern direkte Links zu Herunterladen von mehr als 40 Webseiten, inklusive Dailymotion.com, RapidShare.com, YouTube.com, VK.com und weiteren zu bekommen."},
 "aboutDescriptionLite": {"message": "Hilft den Nutzern direkte Links zu Herunterladen von mehr als 40 Webseiten, inklusive Dailymotion.com, RapidShare.com, VK.com und weiteren zu bekommen."},
 "aboutSupported": {"message": "Unterstützte Ressourcen"},
 "homePage": {"message": "Homepage"},

 "menuTooltip": {"message": "This is a menu of SaveFrom.net Helper.<br><br>Using it, you can download videos and audio from a current page or set up the extension.<br><br>Menu items will vary from site to site.<br><br>You can hide a button with the right click on an icon."},

 "optionsTitle": {"message": "SaveFrom.net Helfer - Einstellungen"},
 "optionsHandleLinks": {"message": "Links handhaben"},
 "optionsFileHostings": {"message": "Zu Dateihoster"},
 "optionsMediaHostings": {"message": "Zu Medienhoster"},
 "optionsModules": {"message": "Module"},
 "optionsYoutube": {"message": "YouTube"},
 "optionsYTHideLinks": {"message": "Links ausblenden"},
 "optionsDailymotion": {"message": "Dailymotion"},
 "optionsVimeo": {"message": "Vimeo"},
 "optionsFacebook": {"message": "Facebook"},
 "optionsSoundcloud": {"message": "SoundCloud"},
 "optionsVkontakte": {"message": "VK"},
 "optionsOdnoklassniki": {"message": "Odnoklassniki"},
 "optionsBitrate": {"message": "Bitrate sofort zeigen"},

 "filelistTitle": {"message": "Die Liste der gefundenen MP3-Dateien"},
 "filelistInstruction": {"message": "Zum Herunterladen aller MP3-Datien kopieren Sie die liste der Links in Ihren <a href=\"http://en.wikipedia.org/wiki/Download_manager\">Download Manager</a>. Wenn Sie noch keinen Download Manager haben we empfehlen wir Ihnen die Installation des <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a>."},
 "playlistTitle": {"message": "Wiedergabliste"},
 "playlistInstruction": {"message": "Um eine Wiedergabliste zu speichern, Rechtsklicken Sie auf den jeweiligen Link und wählen Sie &quot;Ziel speichern unter ...&quot; aus. Oder kopieren Sie den Inhalt des Textfelds und speichern Sie die Datei unter Angabe der entsprechenden Erweiterung.<br><br>Zur Wiedergabe Ihrer gespeicherten Wiedergabliste kann es nun mit einem Musik-Player geöffnet werden."},

 "vkInfo": {"message": "Info"},
 "vkInfoTitle": {"message": "Dateigröße und Bitrate"},
 "vkMp3LinksNotFound": {"message": "Links zu MP3 Dateien wurden nicht gefunden"},
 "vkPhotoLinksNotFound": {"message": "Photos are not found"},
 "vkDownloadPhotoAlbum": {"message": "Album herunterladen"},
 "vkDownloadAllPhotoAlbums": {"message": "Alle Alben herunterladen"},
 "vkFoundPhotos": {"message": "Gefundene Fotos"},
 "vkNotAvailablePhotos": {"message": "%d Foto(s) vorübergehend nicht verfügbar"},
 "vkFoundLinks": {"message": "Gefundene Links"},
 "vkFoundOf": {"message": "von"},
 "vkShowAs": {"message": "Zeigen als"},
 "vkListOfLinks": {"message": "Liste der Links"},
 "vkListOfLinksInstruction": {"message": "Um alle Fotos herunterzuladen, kopieren Sie die Links aus der Liste und fügen Sie diese in Ihren <a href=\"http://en.wikipedia.org/wiki/Download_manager\">Download Manager</a> ein. Wenn Sie noch keinen Download Manager haben we empfehlen wir Ihnen die Installation des <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a>."},
 "vkTableOfThumbnails": {"message": "Tabelle der Thumbnails"},
 "vkListOfPhotos": {"message": "Liste der Fotos"},
 "vkListOfPhotosInstruction": {"message": "Klicken Sie auf ein Foto um es herunterzuladen."},
 "vkKbps": {"message": "kbps"},
 "vkFileSizeByte": {"message": "B"},
 "vkFileSizeKByte": {"message": "kB"},
 "vkFileSizeMByte": {"message": "MB"},
 "vkFileSizeGByte": {"message": "GB"},
 "vkFileSizeTByte": {"message": "TB"},
 "vkDownloadFromYoutube": {"message": "Herunterladen: Öffnen Sie <a href=\"{url}\">die Video Seite</a> und drücken Sie den &quot;Herunterladen&quot; Knopf über dem Video-Spieler"}
};

chrome.i18n.messages.en = {
 "extName": {"message": "SaveFrom.net helper"},
 "extDescription": {"message": "Download YouTube, RapidShare, VK.com and 40+ sites in one click."},

 "extNameLite": {"message": "SaveFrom.net helper lite"},
 "extDescriptionLite": {"message": "Download RapidShare, VK.com and 40+ sites in one click."},

 "lang": {"message": "en"},

 "titleDefault": {"message": "SaveFrom.net helper"},
 "titleDesabled": {"message": "SaveFrom.net helper disabled"},

 "menuEnable": {"message": "Enable"},
 "menuDisable": {"message": "Disable"},

 "download": {"message": "Download"},
 "downloadTitle": {"message": "Click the link while holding Alt/Option or Ctrl key to download the file."},
 "noLinksFound": {"message": "No links were found"},
 "more": {"message": "More"},
 "close": {"message": "Close"},
 "kbps": {"message": "kbps"},
 "withoutAudio": {"message": "without audio"},

 "subtitles": {"message": "Subtitles"},
 "playlist": {"message": "Playlist"},
 "filelist": {"message": "List of files"},
 "downloadWholePlaylist": {"message": "Download the whole playlist"},

 "getFileSizeTitle": {"message": "Get file size" },
 "getFileSizeFailTitle": {"message": "Unable to get the file size. Please try again."},

 "lmButtonTitle": {"message": "Get a direct link"},

 "downloadFromCurrentPage": {"message": "Download from current page"},
 "updateLinks": {"message": "Refresh download links"},
 "updateLinksNotification": {"message": "Links updated"},
 "downloadMP3Files": {"message": "Download all MP3 files"},
 "downloadPlaylist": {"message": "Download MP3 playlist"},
 "downloadPhotos": {"message": "Download all photos"},
 "installFullVersion": {"message": "Install full version"},
 "disable": {"message": "Disable"},
 "showOptions": {"message": "Options"},
 "reportBug": {"message": "Report a bug"},

 "aboutPage": {"message": "About"},
 "aboutTitle": {"message": "SaveFrom.net Helper"},
 "aboutVersion": {"message": "Version"},
 "aboutDescription": {"message": "Helps users to get direct links to download from more than 40 websites, including Dailymotion.com, RapidShare.com, YouTube.com, VK.com and others."},
 "aboutDescriptionLite": {"message": "Helps users to get direct links to download from more than 40 websites, including Dailymotion.com, RapidShare.com, VK.com and others."},
 "aboutSupported": {"message": "Supported resources"},
 "homePage": {"message": "Home page"},

 "menuTooltip": {"message": "This is a menu of SaveFrom.net Helper.<br><br>Using it, you can download videos and audio from a current page or set up the extension.<br><br>Menu items will vary from site to site.<br><br>You can hide a button with the right click on an icon."},

 "optionsTitle": {"message": "SaveFrom.net Helper - Preferences"},
 "optionsHandleLinks": {"message": "Handle links"},
 "optionsFileHostings": {"message": "To filehostings"},
 "optionsMediaHostings": {"message": "To mediahostings"},
 "optionsModules": {"message": "Modules"},
 "optionsYoutube": {"message": "YouTube"},
 "optionsYTHideLinks": {"message": "Hide links"},
 "optionsDailymotion": {"message": "Dailymotion"},
 "optionsVimeo": {"message": "Vimeo"},
 "optionsFacebook": {"message": "Facebook"},
 "optionsSoundcloud": {"message": "SoundCloud"},
 "optionsVkontakte": {"message": "VK"},
 "optionsOdnoklassniki": {"message": "Odnoklassniki"},
 "optionsBitrate": {"message": "Show bitrate instantly"},

 "filelistTitle": {"message": "The list of the found MP3 files"},
 "filelistInstruction": {"message": "To download all MP3 files copy the list of links and paste it into the <a href=\"http://en.wikipedia.org/wiki/Download_manager\">download manager</a>. If you do not have a download manager installed we recommend installing <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a>."},
 "playlistTitle": {"message": "Playlist"},
 "playlistInstruction": {"message": "To save a playlist right-click on the respective link and select &quot;Save Target As ...&quot;. Or copy the text field contents and save the file specifying the appropriate extension.<br><br>To playback the saved playlist it may be now opened in the music player."},

 "vkInfo": {"message": "Info"},
 "vkInfoTitle": {"message": "File size and bitrate"},
 "vkMp3LinksNotFound": {"message": "Links to MP3 files are not found"},
 "vkPhotoLinksNotFound": {"message": "Photos are not found"},
 "vkDownloadPhotoAlbum": {"message": "Download album"},
 "vkDownloadAllPhotoAlbums": {"message": "Download all albums"},
 "vkFoundPhotos": {"message": "Found photos"},
 "vkNotAvailablePhotos": {"message": "%d photos are temporarily unavailable"},
 "vkFoundLinks": {"message": "Found links"},
 "vkFoundOf": {"message": "of"},
 "vkShowAs": {"message": "Show as"},
 "vkListOfLinks": {"message": "List of links"},
 "vkListOfLinksInstruction": {"message": "To download all photos copy the list of links and paste it into the <a href=\"http://en.wikipedia.org/wiki/Download_manager\">download manager</a>. If you do not have a download manager installed we recommend installing <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a>."},
 "vkTableOfThumbnails": {"message": "Table of thumbnails"},
 "vkListOfPhotos": {"message": "List of photos"},
 "vkListOfPhotosInstruction": {"message": "Click on the photo to download it."},
 "vkKbps": {"message": "kbps"},
 "vkFileSizeByte": {"message": "B"},
 "vkFileSizeKByte": {"message": "kB"},
 "vkFileSizeMByte": {"message": "MB"},
 "vkFileSizeGByte": {"message": "GB"},
 "vkFileSizeTByte": {"message": "TB"},
 "vkDownloadFromYoutube": {"message": "Download: open <a href=\"{url}\">the video page</a> and press the &quot;Download&quot; button above the player"}
};

chrome.i18n.messages.ru = {
 "extName": {"message": "SaveFrom.net помощник"},
 "extDescription": {"message": "Скачивайте с Вконтакте, YouTube, RapidShare и еще 40 сайтов за 1 клик."},

 "extNameLite": {"message": "SaveFrom.net помощник lite"},
 "extDescriptionLite": {"message": "Скачивайте с Вконтакте, RapidShare и еще 40 сайтов за 1 клик."},

 "lang": {"message": "ru"},

 "titleDefault": {"message": "SaveFrom.net помощник"},
 "titleDesabled": {"message": "SaveFrom.net помощник выключен"},

 "menuEnable": {"message": "Включить"},
 "menuDisable": {"message": "Выключить"},

 "download": {"message": "Скачать"},
 "downloadTitle": {"message": "Нажмите на ссылку, удерживая клавишу Alt или Ctrl, чтобы сохранить файл."},
 "noLinksFound": {"message": "Не удалось найти ссылки"},
 "more": {"message": "Ещё"},
 "close": {"message": "Закрыть"},
 "kbps": {"message": "кб/с"},
 "withoutAudio": {"message": "без аудио"},

 "subtitles": {"message": "Субтитры"},
 "playlist": {"message": "Плейлист"},
 "filelist": {"message": "Список файлов"},
 "downloadWholePlaylist": {"message": "Скачать весь плейлист"},

 "getFileSizeTitle": {"message": "Определить размер файла" },
 "getFileSizeFailTitle": {"message": "Не удалось определить размер файла. Попробуйте повторить попытку."},

 "lmButtonTitle": {"message": "Получи прямую ссылку"},

 "downloadFromCurrentPage": {"message": "Скачать с текущей страницы"},
 "updateLinks": {"message": "Обновить ссылки для скачивания"},
 "updateLinksNotification": {"message": "Ссылки обновлены"},
 "downloadMP3Files": {"message": "Скачать все MP3 файлы"},
 "downloadPlaylist": {"message": "Скачать MP3 плейлист"},
 "downloadPhotos": {"message": "Скачать все фотографии"},
 "installFullVersion": {"message": "Установить полную версию"},
 "disable": {"message": "Выключить"},
 "showOptions": {"message": "Настройки"},
 "reportBug": {"message": "Сообщить об ошибке"},

 "aboutPage": {"message": "О расширении"},
 "aboutTitle": {"message": "SaveFrom.net помощник"},
 "aboutVersion": {"message": "Версия"},
 "aboutDescription": {"message": "Позволяет получать прямые ссылки для скачивания с более чем 40 сайтов, среди которых  Vkontakte.ru, RapidShare.com, YouTube.com и другие."},
 "aboutDescriptionLite": {"message": "Позволяет получать прямые ссылки для скачивания с более чем 40 сайтов, среди которых  Vkontakte.ru, RapidShare.com и другие."},
 "aboutSupported": {"message": "Поддерживаемые ресурсы"},
 "homePage": {"message": "Домашняя страница"},

 "menuTooltip": {"message": "Это меню SaveFrom.net помощника.<br><br>С его помощью можно скачивать видео, аудио, плейлисты с текущей страницы и настраивать расширение.<br><br>Возможности меню зависят от сайта, на котором вы находитесь.<br><br>Скрыть кнопку можно щелчком правой кнопкой мышки на значке."},

 "optionsTitle": {"message": "SaveFrom.net помощник - Настройки"},
 "optionsHandleLinks": {"message": "Обрабатывать ссылки"},
 "optionsFileHostings": {"message": "На файлообменники"},
 "optionsMediaHostings": {"message": "На медиахостинги"},
 "optionsModules": {"message": "Модули"},
 "optionsYoutube": {"message": "YouTube"},
 "optionsYTHideLinks": {"message": "Скрывать ссылки"},
 "optionsDailymotion": {"message": "Dailymotion"},
 "optionsVimeo": {"message": "Vimeo"},
 "optionsFacebook": {"message": "Facebook"},
 "optionsSoundcloud": {"message": "SoundCloud"},
 "optionsVkontakte": {"message": "Вконтакте"},
 "optionsOdnoklassniki": {"message": "Одноклассники"},
 "optionsBitrate": {"message": "Показывать битрейт сразу"},

 "filelistTitle": {"message": "Список найденных MP3 файлов"},
 "filelistInstruction": {"message": "Чтобы скачать все MP3 файлы, скопируйте список ссылок и вставьте его в <a href=\"http://ru.wikipedia.org/wiki/Менеджер_загрузок\">менеджер закачек</a>. Если у вас не установлен менеджер закачек, рекомендуем установить <a href=\"http://www.westbyte.com/dm/\">Download Master</a>."},
 "playlistTitle": {"message": "Плейлист"},
 "playlistInstruction": {"message": "Чтобы сохранить плейлист, щелкните правой кнопкой мыши по соответствующей ссылке и выберите в меню пункт &quot;Сохранить объект как...&quot;. Либо скопируйте содержимое текстового поля, и сохраните в файл с соответствующим расширением.<br><br>Сохраненный плейлист можно открыть в плеере для  воспроизведения."},


 "vkInfo": {"message": "Параметры"},
 "vkInfoTitle": {"message": "Размер файла и битрейт"},
 "vkMp3LinksNotFound": {"message": "Не найдены ссылки на MP3 файлы"},
 "vkPhotoLinksNotFound": {"message": "Не найдены ссылки на фотографии"},
 "vkDownloadPhotoAlbum": {"message": "Скачать альбом"},
 "vkDownloadAllPhotoAlbums": {"message": "Скачать все альбомы"},
 "vkFoundPhotos": {"message": "Найдено фотографий"},
 "vkNotAvailablePhotos": {"message": "%d фото временно не доступно"},
 "vkFoundLinks": {"message": "Найдено ссылок"},
 "vkFoundOf": {"message": "из"},
 "vkShowAs": {"message": "Показать как"},
 "vkListOfLinks": {"message": "Список ссылок"},
 "vkListOfLinksInstruction": {"message": "Чтобы скачать все фотографии, скопируйте список ссылок и вставьте его в <a href=\"http://ru.wikipedia.org/wiki/Менеджер_загрузок\">менеджер закачек</a>. Если у вас не установлен менеджер закачек, рекомендуем установить <a href=\"http://www.westbyte.com/dm/\">Download Master</a>."},
 "vkTableOfThumbnails": {"message": "Таблицу эскизов"},
 "vkListOfPhotos": {"message": "Список фотографий"},
 "vkListOfPhotosInstruction": {"message": "Чтобы скачать фотографию, щелкните на ней левой кнопкой мыши."},
 "vkKbps": {"message": "кб/с"},
 "vkFileSizeByte": {"message": "Б"},
 "vkFileSizeKByte": {"message": "кБ"},
 "vkFileSizeMByte": {"message": "МБ"},
 "vkFileSizeGByte": {"message": "ГБ"},
 "vkFileSizeTByte": {"message": "ТБ"},
 "vkDownloadFromYoutube": {"message": "Скачать: откройте <a href=\"{url}\">страницу видео ролика</a> и нажмите кнопку &quot;Скачать&quot; над плеером"}
};

chrome.i18n.messages.tr = {
 "extName": {"message": "SaveFrom.net asistan"},
 "extDescription": {"message": "Sadece bir tıklama ile YouTube, RapidShare, VK.com ve 40'dan fazla siteden dosya indirin."},

 "extNameLite": {"message": "SaveFrom.net asistan lite"},
 "extDescriptionLite": {"message": "Sadece bir tıklama ile RapidShare, VK.com ve 40'dan fazla siteden dosya indirin"},

 "lang": {"message": "tr"},

 "titleDefault": {"message": "SaveFrom.net asistan"},
 "titleDesabled": {"message": "SaveFrom.net asistan devre dışı"},

 "menuEnable": {"message": "Etkin"},
 "menuDisable": {"message": "Devre dışı"},

 "download": {"message": "İndir"},
 "downloadTitle": {"message": "Dosyayı indirmek için Alt/Option veya Ctrl tuşuna basılı tutarak bağlantıyı tıklayın."},
 "noLinksFound": {"message": "Hiçbir bağlantı bulunamadı"},
 "more": {"message": "Daha fazla"},
 "close": {"message": "Kapat"},
 "kbps": {"message": "kbps"},
 "withoutAudio": {"message": "without audio"},

 "subtitles": {"message": "Alt yazı"},
 "playlist": {"message": "Çalma listesi"},
 "filelist": {"message": "Dosya listesi"},
 "downloadWholePlaylist": {"message": "Tüm çalma listesini indir"},

 "getFileSizeTitle": {"message": "Dosya boyutunu al" },
 "getFileSizeFailTitle": {"message": "Dosya boyutu alınamadı. Lütfen tekrar deneyiniz."},

 "lmButtonTitle": {"message": "Doğrudan bağlantı al"},

 "downloadFromCurrentPage": {"message": "Geçerli sayfadan indir"},
 "updateLinks": {"message": "İndirme bağlantılarını yenile"},
 "updateLinksNotification": {"message": "Links updated"},
 "downloadMP3Files": {"message": "Tüm MP3 dosyalarını indir"},
 "downloadPlaylist": {"message": "MP3 çalma listesini indir"},
 "downloadPhotos": {"message": "Tüm fotoğrafları indir"},
 "installFullVersion": {"message": "Tam versiyonu kur"},
 "disable": {"message": "Devre dışı"},
 "showOptions": {"message": "Options"},
 "reportBug": {"message": "Report a bug"},

 "aboutPage": {"message": "Hakkında"},
 "aboutTitle": {"message": "SaveFrom.net Asistan"},
 "aboutVersion": {"message": "Versiyon"},
 "aboutDescription": {"message": "Kullanıcıların, Dailymotion.com, RapidShare.com, YouTube.com, VK.com ve diğerleri de dahil olmak üzere 40'dan fazla web sitesinden dosya indirmek için doğrudan bağlantılar almalarını sağlar."},
 "aboutDescriptionLite": {"message": "Kullanıcıların, Dailymotion.com, RapidShare.com, VK.com ve diğerleri de dahil olmak üzere 40'dan fazla web sitesinden dosya indirmek için doğrudan bağlantılar almalarını sağlar."},
 "aboutSupported": {"message": "Desteklenen kaynaklar"},
 "homePage": {"message": "Ana Sayfa"},

 "menuTooltip": {"message": "This is a menu of SaveFrom.net Helper.<br><br>Using it, you can download videos and audio from a current page or set up the extension.<br><br>Menu items will vary from site to site.<br><br>You can hide a button with the right click on an icon."},

 "optionsTitle": {"message": "SaveFrom.net Asistan - Tercihler"},
 "optionsHandleLinks": {"message": "Linkleri taşı"},
 "optionsFileHostings": {"message": "Dosya paylaşıma"},
 "optionsMediaHostings": {"message": "Medya paylaşıma"},
 "optionsModules": {"message": "Modüller"},
 "optionsYoutube": {"message": "YouTube"},
 "optionsYTHideLinks": {"message": "Bağlantıları gizle"},
 "optionsDailymotion": {"message": "Dailymotion"},
 "optionsVimeo": {"message": "Vimeo"},
 "optionsFacebook": {"message": "Facebook"},
 "optionsSoundcloud": {"message": "SoundCloud"},
 "optionsVkontakte": {"message": "VK"},
 "optionsOdnoklassniki": {"message": "Odnoklassniki"},
 "optionsBitrate": {"message": "Bit hızını anlık olarak göster"},

 "filelistTitle": {"message": "Bulunan MP3 dosyalarını listesi"},
 "filelistInstruction": {"message": "Tüm MP3 dosyalarını indirmek için bağlantı listesini kopyalayın ve <a href=\"http://en.wikipedia.org/wiki/Download_manager\">indirme yöneticisine</a> yapıştırın. Kurulu bir indirme yöneticiniz yoksa <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a> yüklemenizi tavsiye ederiz."},
 "playlistTitle": {"message": "Çalma Listesi"},
 "playlistInstruction": {"message": "Çalma listesini kaydetmek için, linke sağ tıklayın ve &quot;Hedefi Farklı Kaydet...&quot; seçeneğini seçin. Ya da metin kutusunun içeriğini kopyalayın ve uygun uzantıyı belirterek dosyayı kaydedin. <br><br>Artık kaydedilen çalma listenizi yürütmek için müzik çalarınızda açabilirsiniz."},

 "vkInfo": {"message": "Bilgi"},
 "vkInfoTitle": {"message": "Dosya boyutu ve bit hızı"},
 "vkMp3LinksNotFound": {"message": "MP3 dosyaları için bağlantılar bulunamıyor"},
 "vkPhotoLinksNotFound": {"message": "Fotoğraflar bulunamadı"},
 "vkDownloadPhotoAlbum": {"message": "Albümü indir"},
 "vkDownloadAllPhotoAlbums": {"message": "Tüm albümleri indir"},
 "vkFoundPhotos": {"message": "Bulunan fotoğraflar"},
 "vkNotAvailablePhotos": {"message": "%d resim geçici olarak kullanılamıyor"},
 "vkFoundLinks": {"message": "Bulunan bağlantılar"},
 "vkFoundOf": {"message": "den"},
 "vkShowAs": {"message": "Olarak göster"},
 "vkListOfLinks": {"message": "Bağlantı listesi"},
 "vkListOfLinksInstruction": {"message": "Tüm fotoğrafları indirmek için bağlantı listesini kopyalayın ve <a href=\"http://en.wikipedia.org/wiki/Download_manager\">indirme yöneticisine</a> yapıştırın. Kurulu bir indirme yöneticiniz yoksa <a href=\"http://www.freedownloadmanager.org/\">Free Download Manager</a> yüklemenizi tavsiye ederiz."},
 "vkTableOfThumbnails": {"message": "Küçükk resimler tablosu"},
 "vkListOfPhotos": {"message": "Fotoğraf listesi"},
 "vkListOfPhotosInstruction": {"message": "İndirmek için fotoğrafın üzerine tıklayın."},
 "vkKbps": {"message": "kbps"},
 "vkFileSizeByte": {"message": "B"},
 "vkFileSizeKByte": {"message": "kB"},
 "vkFileSizeMByte": {"message": "MB"},
 "vkFileSizeGByte": {"message": "GB"},
 "vkFileSizeTByte": {"message": "TB"},
 "vkDownloadFromYoutube": {"message": "İndirme: <a href=\"{url}\">video sayfasını</a> açın ve oynatıcı üzerindeki &quot;İndir&quot; dümesine basın"}
};

chrome.i18n.messages.uk = {
 "extName": {"message": "SaveFrom.net помічник"},
 "extDescription": {"message": "Завантажуйте з «ВКонтакте», YouTube, RapidShare і ще 40 сайтів за 1 клік."},

 "extNameLite": {"message": "SaveFrom.net помічник lite"},
 "extDescriptionLite": {"message": "Завантажуйте з «ВКонтакте», YouTube, RapidShare і ще 40 сайтів за 1 клік."},

 "lang": {"message": "ru"},

 "titleDefault": {"message": "SaveFrom.net помічник"},
 "titleDesabled": {"message": "SaveFrom.net помічник вимкнений"},

 "menuEnable": {"message": "Увімкнути"},
 "menuDisable": {"message": "Вимкнути"},

 "download": {"message": "Завантажити"},
 "downloadTitle": {"message": "Натисніть на посилання, утримуючи клавішу Alt чи Ctrl, щоб зберегти файл."},
 "noLinksFound": {"message": "Не вдалося знайти посилання"},
 "more": {"message": "Ще"},
 "close": {"message": "Закрити"},
 "kbps": {"message": "кб/с"},
 "withoutAudio": {"message": "без аудіо"},

 "subtitles": {"message": "Субтитри"},
 "playlist": {"message": "Плейліст"},
 "filelist": {"message": "Список файлів"},
 "downloadWholePlaylist": {"message": "Завантажити весь плейліст"},

 "getFileSizeTitle": {"message": "Визначити розмір файлу" },
 "getFileSizeFailTitle": {"message": "Не вдалося визначити розмір файлу. Спробуйте ще раз."},

 "lmButtonTitle": {"message": "Отримай пряме посилання"},

 "downloadFromCurrentPage": {"message": "Завантажити з поточної сторінки"},
 "updateLinks": {"message": "Оновити посилання для завантаження"},
 "updateLinksNotification": {"message": "Links updated"},
 "downloadMP3Files": {"message": "Завантажити усі MP3-файли"},
 "downloadPlaylist": {"message": "Завантажити MP3-плейліст"},
 "downloadPhotos": {"message": "Завантажити усі фотографії"},
 "installFullVersion": {"message": "Встановити повну версію"},
 "disable": {"message": "Вимкнути"},
 "showOptions": {"message": "Options"},
 "reportBug": {"message": "Повідомити про помилку"},

 "aboutPage": {"message": "Про розширення"},
 "aboutTitle": {"message": "SaveFrom.net помічник"},
 "aboutVersion": {"message": "Версія"},
 "aboutDescription": {"message": "Дозволяє отримувати прямі посилання для завантаження з понад 40 сайтів, серед яких Vkontakte.ru, RapidShare.com, YouTube.com та інші."},
 "aboutDescriptionLite": {"message": "Дозволяє отримувати прямі посилання для завантаження з понад 40 сайтів, серед яких Vkontakte.ru, RapidShare.com та інші."},
 "aboutSupported": {"message": "Ресурси, які підтримуються"},
 "homePage": {"message": "Домашня сторінка"},

 "menuTooltip": {"message": "This is a menu of SaveFrom.net Helper.<br><br>Using it, you can download videos and audio from a current page or set up the extension.<br><br>Menu items will vary from site to site.<br><br>You can hide a button with the right click on an icon."},

 "optionsTitle": {"message": "SaveFrom.net помічник - Налаштування"},
 "optionsHandleLinks": {"message": "Обробляти посилання"},
 "optionsFileHostings": {"message": "На файлообмінники"},
 "optionsMediaHostings": {"message": "На медіахостинги"},
 "optionsModules": {"message": "Модулі"},
 "optionsYoutube": {"message": "YouTube"},
 "optionsYTHideLinks": {"message": "Сховати посилання"},
 "optionsDailymotion": {"message": "Dailymotion"},
 "optionsVimeo": {"message": "Vimeo"},
 "optionsFacebook": {"message": "Facebook"},
 "optionsSoundcloud": {"message": "SoundCloud"},
 "optionsVkontakte": {"message": "ВКонтакте"},
 "optionsOdnoklassniki": {"message": "Одноклассники"},
 "optionsBitrate": {"message": "Показувати бітрейт одразу"},

 "filelistTitle": {"message": "Список знайдених MP3-файлів"},
 "filelistInstruction": {"message": "Щоб завантажити усі MP3-файли, скопіюйте список посилань і вставте його у <a href=\"http://ru.wikipedia.org/wiki/Менеджер_загрузок\">менеджер завантажень</a>. Якщо у вас не встановлений менеджер завантажень, рекомендуємо встановити <a href=\"http://www.westbyte.com/dm/\">Download Master</a>."},
 "playlistTitle": {"message": "Плейліст"},
 "playlistInstruction": {"message": "Щоб зберегти плейліст, натисніть правою кнопкою миші на відповідне посилання і оберіть у меню пункт &quot;Зберегти об'єкт як...&quot;. Або скопіюйте вміст текстового поля і збережіть у файл з відповідним розширенням.<br><br>Збережений плейліст можна відкрити у плеєрі для відтворення."},


 "vkInfo": {"message": "Параметри"},
 "vkInfoTitle": {"message": "Розмір файлу і бітрейт"},
 "vkMp3LinksNotFound": {"message": "Не знайдено посилань на MP3-файли"},
 "vkPhotoLinksNotFound": {"message": "Не знайдено посилань на фотографії"},
 "vkDownloadPhotoAlbum": {"message": "Завантажити альбом"},
 "vkDownloadAllPhotoAlbums": {"message": "Завантажити усі альбоми"},
 "vkFoundPhotos": {"message": "Знайдено фотографій"},
 "vkNotAvailablePhotos": {"message": "%d фото тимчасово недоступно"},
 "vkFoundLinks": {"message": "Знайдено посилань"},
 "vkFoundOf": {"message": "з"},
 "vkShowAs": {"message": "Показати як"},
 "vkListOfLinks": {"message": "Список посилань"},
 "vkListOfLinksInstruction": {"message": "Щоб завантажити усі фотографії, скопіюйте список посилань і вставте його у <a href=\"http://ru.wikipedia.org/wiki/Менеджер_загрузок\">менеджер завантажень</a>. Якщо у вас не встановлений менеджер завантажень, рекомендуємо встановити <a href=\"http://www.westbyte.com/dm/\">Download Master</a>."},
 "vkTableOfThumbnails": {"message": "Таблицю ескізів"},
 "vkListOfPhotos": {"message": "Список фотографій"},
 "vkListOfPhotosInstruction": {"message": "Щоб завантажити фотографію, натисніть на неї лівою кнопкою миші."},
 "vkKbps": {"message": "кб/с"},
 "vkFileSizeByte": {"message": "Б"},
 "vkFileSizeKByte": {"message": "кБ"},
 "vkFileSizeMByte": {"message": "МБ"},
 "vkFileSizeGByte": {"message": "ГБ"},
 "vkFileSizeTByte": {"message": "ТБ"},
 "vkDownloadFromYoutube": {"message": "Завантажити: відкрийте <a href=\"{url}\">сторінку відео-ролика</a> і натисніть кнопку &quot;Завантажити&quot; над плеєром"}
};



// RUN
chrome.i18n.detectUserLanguage();
_background();

var host = SaveFrom_Utils.getTopLevelDomain(location.hostname);
if(!host)
  return;

var moduleName = 'lm';
if(_moduleHosts[host] && _modules[_moduleHosts[host]])
  moduleName = _moduleHosts[host];


var _this = this;
setTimeout(function(){
  if(!window.sessionStorage || sessionStorage['savefrom-helper-extension'] != '1')
  {
    _modules[moduleName].call(_this);
  }
}, 1000);

})();

