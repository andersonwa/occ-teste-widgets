/**
 * @fileoverview Header Widget.
 *
 */
define(
//-------------------------------------------------------------------
// DEPENDENCIES
//-------------------------------------------------------------------
[
  'knockout',
  'pubsub',
  'notifications',
  'CCi18n',
  'ccConstants',
  'navigation',
  'ccLogger',
  'jquery',
  'ccNumber',
  'storageApi'
],

//-------------------------------------------------------------------
// MODULE DEFINITION
//-------------------------------------------------------------------
function(ko, pubsub, notifications, CCi18n, CCConstants, navigation, ccLogger, $, ccNumber, storageApi) {

  "use strict";

  return {

    linkList: ko.observableArray(), WIDGET_ID: 'header',

    // Keep track on whether the user should be able to see the cart.
    cartVisible: ko.observable(false),
    ignoreBlur: ko.observable(false),
    selectedStore: ko.observable(),
    selectedStoreLogo: ko.observable(),
    floatMenu: ko.observable(false),

    onLoad: function(widget) {
      var isMegaMenuExpanded = false;
      ccLogger.info('on header load cart contains ' + widget.cart().items().length);

      // save the links in an array for later
      widget.linkList.removeAll();

      for (var propertyName in widget.links()) {
        widget.linkList.push(widget.links()[propertyName]);
      }

      // compute function to create the text for the cart link  "0 items - $0.00" "1 item - $15.25" "2 items - $41.05"
      widget.cartLinkText = ko.computed(function() {
        var cartSubTotal,
          linkText,
          numItems;
        var currencySymbol = widget.site().selectedPriceListGroup().currency.symbol;
        var cartSubTotal = widget.formatPrice(widget.cart().subTotal(), widget.site().selectedPriceListGroup().currency.fractionalDigits);
        if (currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
          currencySymbol = currencySymbol + ' ';
        }
        numItems = widget.ccNumber(widget.cart().numberOfItems());
        // use the CCi18n to format the text avoiding concatination  "0 items - $0.00"
        // we need to get the currency symbol from the site currently set to a $
        linkText = CCi18n.t('ns.common:resources.cartDropDownText', {
          count: widget.cart().numberOfItems(),
          formattedCount: numItems,
          currency: currencySymbol,
          totalPrice: cartSubTotal
        });
        return linkText;
      }, widget);
      var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
      if (isiPad) {
        $(window).on('touchend', function(event) {
          if (!($(event.target).closest('#dropdowncart').length)) {
            //close the mini cart if clicked outside minicart
            $('#dropdowncart > .content').fadeOut('slow');
            $('#dropdowncart').removeClass('active');
          }
          if (!($(event.target).closest('#languagedropdown').length)) {
            //close the language picker if clicked outside language picker
            $('#languagedropdown > .content').fadeOut('slow');
            $('#languagedropdown').removeClass('active');
          }
          if (!($(event.target).closest('#CC-megaMenu').length)) {
            //close the mega menu if clicked outside mega menu
            $('li.cc-desktop-dropdown:hover > ul.dropdown-menu').css("display", "none");
            isMegaMenuExpanded = false;
          } else {
            if ($(event.target).closest('a').next('ul').length === 0) {
              return true;
            }
            //for ipad, clicking on megaMenu should show the megaMenu drop down, clicking again will take to the category page
            if (!isMegaMenuExpanded && $(window).width() >= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
              isMegaMenuExpanded = true;
              return false;
            } else if (isMegaMenuExpanded && $(event.target).closest('a').attr('href') === navigation.getRelativePath()) {
              return false;
            } else {
              return true;
            }
          }
        });
      }
      this.controlSearch();
      this.toggleMobileMenu();
      this.toggleSearchMobile();
      this.toggleMobileNavigation();
      /*
      / Toggle minicart
       */
       console.log('Alteração');
       $(document).on('mouseleave', '.pft-header-dropdown-minicart-widget', function() {
         console.log('mouseleave');
         $('.pft-header-dropdown-minicart-widget').find('.content').fadeOut('fast');
       });

       $(document).on('mouseover', '.cc-cartlink-anchor',function() {
         console.log('hover');
         $('.pft-header-dropdown-minicart-widget').find('.content').fadeIn('fast');
       });
      /*
      / Fim Toggle minicart
       */
      /**
       * SELECT STORE
       */
      var storeCookie = storageApi.getInstance().getItem("pft.selectedStore") || "CS";
      widget.selectedStore(storeCookie);
      widget.changeSelectStoreLogo(storeCookie);
      $.Topic('STORE_CHANGED').publish();

      $.Topic("STORE_CHANGED").subscribe(function(msg) {
        console.info("STORE_CHANGED", msg);
        $(document).ajaxComplete(function() {
          if ($('.menu-item.colecao').length === 0) {
            $('.nav.navbar-nav').prepend('<li class="menu-item colecao"><a href="/a-colecao" class="Level1" title="A Coleção"><span>A Coleção</span></a></li>');
          }
        })
      });

      $(document).on('ajaxStop', function() {
        if ($('.menu-item.colecao').length === 0) {
          $('.nav.navbar-nav').prepend('<li class="menu-item colecao"><a href="/a-colecao" class="Level1" title="A Coleção"><span>A Coleção</span></a></li>');
        }
      });

      widget.floatMenuControl();

      this.loadStoreOnLoad();

      this.helloBar();

    },

    floatMenuControl: function() {
      $(window).on('scroll', function() {
        if (window.scrollY > 200) {
          this.floatMenu(true);
        } else {
          this.floatMenu(false);
        }
      }.bind(this));
    },

    markSelectStoreMenu: function(ss) {
        $.Topic("STORE_CHANGED").publish(ss);
        storageApi.getInstance().setItem("pft.selectedStore", ss);
        this.selectedStore(ss);
        this.changeSelectStoreLogo(ss);
        console.log('layoutName: ', this.layoutName);

        // var carmen, raphael;

        if (ss == 'RS') {
          if ((window.location.pathname.indexOf('home') != -1 || window.location.pathname.indexOf('/') != -1 || window.location.pathname.indexOf('carmen-steffens') != -1) && (window.location.pathname.indexOf('quem-somos-raphael-steffens') == -1)) {
            // window.location = $('.top-main-header .navbar-nav > .menu-item').eq(0).find('a').eq(0)[0].href;
            // navigation.goTo($('.top-main-header .navbar-nav > .menu-item').eq(0).find('a').eq(0)[0].href);
            navigation.goTo('/raphael-steffens/sapatos-masculinos');
          }
          if (window.location.pathname.indexOf('/quem-somos?store=CS') != -1) {
            // window.location = '/quem-somos-raphael-steffens?store=RS';
            navigation.goTo('/quem-somos-raphael-steffens?store=RS');
          }
        } else if (ss == 'CS') {
          if ((window.location.pathname.indexOf('/carmen-steffens/') != -1) || (window.location.pathname.indexOf('/a-colecao') != -1)) {
            // window.location = '/home';
            navigation.goTo('/home');
          }
          if (window.location.pathname.indexOf('/raphael-steffens') != -1) {
            navigation.goTo('/home');
            // window.location = '/home';
          }
          if (window.location.pathname.indexOf('/quem-somos-raphael-steffens') != -1) {
            // window.location = '/quem-somos?store=CS';
            navigation.goTo('/quem-somos?store=CS');
          }
        } else if(ss == 'CSC') {
          // navigation.goTo($('.top-main-header .navbar-nav > .menu-item').eq(0).find('a').eq(0)[0].href);
          navigation.goTo('/cs-club/sapatos-cs-club');
        }
        
    },

    changeSelectStoreLogo: function(ss) {
      console.log('changeSelectStoreLogo');
      switch (ss) {
        case "CS":
          this.selectedStoreLogo(JSON.parse('{"route": "/home","src": "/file/general/logo.jpg","alt": "Carmen Steffens"}'));
          break;
        case "RS":
          this.selectedStoreLogo(JSON.parse('{"route": "/raphael-steffens/sapatos-masculinos","src": "/file/general/rs-logo.svg","alt": "Rafael Steffens"}'));
          break;
        case "CSC":
          this.selectedStoreLogo(JSON.parse('{"route": "/home","src": "/file/general/cs-club-logo.svg","alt": "CS Club"}'));
      }
    },

    getParameterByName: function(name, url) {
      if (!url) 
        url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
      if (!results) 
        return null;
      if (!results[2]) 
        return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    loadStoreOnLoad: function() {
      $(document).one('ajaxStop', function() {
        var store = this.getParameterByName('store');
        console.log('store', store);
        switch (store) {
          case "CS":
            this.markSelectStoreMenu('CS');
            $('.top-main-header__link-item--carmen').eq(1).click();
            break;
          case "RS":
            this.markSelectStoreMenu('RS');
            $('.top-main-header__link-item--rafael').eq(1).click();
            break;
          case "CSC":
            this.markSelectStoreMenu('CSC');
            $('.top-main-header__link-item--csclub').eq(1).click();
        }
      }.bind(this));
    },

    beforeAppear: function(page) {},
    /**
             * key press event handle
             *
             * data - knockout data
             * event - event data
             */
    keypressHandler: function(data, event) {

      var self,
        $this,
        keyCode;

      self = this;
      $this = $(event.target);
      keyCode = event.which
        ? event.which
        : event.keyCode;

      if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
        keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
      }
      switch (keyCode) {
        case CCConstants.KEY_CODE_TAB:
          if (!($this[0].id === "CC-header-cart-total")) {
            this.handleCartClosedAnnouncement();
            $('#dropdowncart').removeClass('active');
          }
          break;

        case CCConstants.KEY_CODE_SHIFT_TAB:
          if ($this[0].id === "CC-header-cart-total") {
            this.handleCartClosedAnnouncement();
            $('#dropdowncart').removeClass('active');
          }
      }
      return true;
    },

    showDropDownCart: function() {

      // Clear any previous timeout flag if it exists
      if (this.cartOpenTimeout) {
        clearTimeout(this.cartOpenTimeout);
      }

      // Tell the template its OK to display the cart.
      this.cartVisible(true);

      $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));
      $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));

      notifications.emptyGrowlMessages();
      this.computeDropdowncartHeight();
      this['pft-header-dropdown-minicart'].currentSection(1);
      this.computeMiniCartItems();
      $('#dropdowncart').addClass('active');
      $('#dropdowncart > .content').fadeIn('slow');

      var self = this;
      // $(document).on('mouseleave', '#dropdowncart', function() {
      //   self.handleCartClosedAnnouncement();
      //   $('#dropdowncart > .content').fadeOut('slow');
      //   $(this).removeClass('active');
      // });

      // $(document).on('click', '#closecart', function(e) {
      //   e.preventDefault();
      //   $('.PFTmainHeader #dropdowncart').find('.content').fadeOut('slow');
      //   //self.handleCartClosedAnnouncement();
      //   //$(this).removeClass('active');
      // });
      //
      

      // to handle the mouseout/mouseleave events for ipad for mini-cart
      var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
      if (isiPad) {
        $(document).on('touchend', function(event) {
          if (!($(event.target).closest('#dropdowncart').length)) {
            self.handleCartClosedAnnouncement();
            $('#dropdowncart > .content').fadeOut('slow');
            $('#dropdowncart').removeClass('active');
          }
        });
      }
    },

    hideDropDownCart: function() {
      // Tell the template the cart should no longer be visible.
      this.cartVisible(false);

      $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
      $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
      setTimeout(function() {
        $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
      }, 1000);

      $('#dropdowncart > .content').fadeOut('slow');
      $('#dropdowncart').removeClass('active');

      // Clear the timeout flag if it exists
      if (this.cartOpenTimeout) {
        clearTimeout(this.cartOpenTimeout);
      }

      return true;
    },

    toggleDropDownCart: function() {

      if ($('#dropdowncart').hasClass('active')) {
        this.hideDropDownCart();
      } else {
        this.showDropDownCart();
      }
    },

    // Sends a message to the cart to remove this product
    handleRemoveFromCart: function() {

      $.Topic(pubsub.topicNames.CART_REMOVE).publishWith(this.productData(), [
        {
          "message": "success",
          "commerceItemId": this.commerceItemId
        }
      ]);
    },

    // Sends a message to the cart to remove this placeholder
    handlePlaceHolderRemove: function() {
      $.Topic(pubsub.topicNames.PLACE_HOLDER_REMOVE).publish(this);
    },

    /**
             * validate the cart items stock status as per the quantity. base on the
             * stock status of cart items redirect to checkout or cart
             */
    handleValidateCart: function(data, event) {
      // returns if the profile has unsaved changes.
      if (data.user().isUserProfileEdited()) {
        return true;
      }
      data.cart().validatePrice = true;
      if (navigation.getRelativePath() == data.links().cart.route) {
        data.cart().skipPriceChange(true);
      }
      $.Topic(pubsub.topicNames.LOAD_CHECKOUT).publishWith(data.cart(), [
        {
          message: "success"
        }
      ]);
    },

    handleDropDownCheckout: function(data, event) {
      this.hideDropDownCart();
      this.handleValidateCart(data, event);
    },

    /**
             * Invoked to skip the repetitive navigation for assistive technologies
             */
    skipToContentHandler: function() {
      var id,
        i,
        regionsRendered = this;
      for (i = 0; i < regionsRendered.length; i++) {
        if (regionsRendered[i].type() === CCConstants.REGION_TYPE_BODY) {
          break;
        }
      }
      if (i == regionsRendered.length) {
        id = $("#main .row .redBox div:first-child").attr("id");
      } else {
        id = 'region-' + regionsRendered[i].name();
      }

      var idGen = "#" + id + " :focusable";
      if (idGen) {
        $(idGen).first().focus();
      }
    },

    /**
             * Process the Nr parameter by removing product.priceListPair or product.language
             */
    processNrParameter: function(data, source) {
      if (data.indexOf('(') === -1) {
        return data;
      }
      var rightToken = data.split('(')[1];
      var parseString = rightToken.split(')')[0];
      var tokenizedKeys = parseString.split(',');
      var finalString = '';
      for (var i = 0; i < tokenizedKeys.length; i++) {
        if (tokenizedKeys[i].indexOf('product.priceListPair') !== -1 && source === 'currency-picker') {
          continue;
        } else if (tokenizedKeys[i].indexOf('product.language') !== -1 && source === 'language-picker') {
          continue;
        }
        if (finalString === '') {
          finalString = tokenizedKeys[i];
        } else {
          finalString = finalString + "," + tokenizedKeys[i];
        }
      }
      finalString = data.split('(')[0] + '(' + finalString;
      finalString = finalString + ')' + data.split(')')[1];
      return finalString;
    },

    /**
             * Hand the aria announcement when the minicart is closed
             */
    handleCartClosedAnnouncement: function() {
      if ($('#dropdowncart').hasClass('active')) {
        $('#alert-modal-change').text(CCi18n.t('ns.common:resources.miniCartClosedText'));
        $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
      }
    },

    controlSearch: function() {
      $(document).on('click', '.label-hidden', function(e) {
        e.preventDefault();
        $('.form-search .search').addClass('active');
        $('.bg-search').addClass('active');
        $('#CC-headerWidget-Search').eq(0).focus();
      });
      //$(document).on('click', '.bg-search, #searchSubmit', function(e) {
      $(document).on('click', '.bg-search', function(e) {
        e.preventDefault();
        $('.form-search .search').removeClass('active');
        $('.bg-search').removeClass('active');
      });

      $(document).on('click', '#searchSubmit', function(e) {
        e.preventDefault();
        $(this).parents('.form-search').submit();
        console.info('Busca enviada');
      });
    },

    /**
             * Toggle mobile menu
             */

    toggleMobileMenu: function() {
      //Adicionando overlay
      $('#overlay').length === 0
        ? $('body').append('<div id="overlay"></div>')
        : false;

      $(document).on('click', '#toggle-navigation', function(e) {
        e.preventDefault();
        $('html').addClass('menu-is-open');
        $('#overlay').fadeIn();
      });

      //Click Overlay
      $('#overlay').on('click', function(e) {
        e.preventDefault();
        $('html').removeClass('menu-is-open');
        $('.mobile-navigation__top-navigation--sub').removeClass('active');
        $(this).fadeOut();
      });
    },

    /**
              * Toggle search mobile
              */

    toggleSearchMobile: function() {
      $(document).on('click', '.toggle-search', function(e) {
        e.preventDefault();
        $('.form-search').find('label.label-hidden').click();
      });
    },

    /**
               * Toggle mobile navigation
               */
    toggleMobileNavigation: function() {
      $(document).on('click', '.mobile-navigation__bottom-navigation a[href="#"]', function(e) {
        e.preventDefault();
        $(this).next('ul').slideToggle();
      });

      //Top menu
      $(document).on('click', '.mobile-navigation__top-navigation a[href="#"]', function(e) {
        e.preventDefault();
        $(this).next('.mobile-navigation__top-navigation--sub').addClass('active');
      });

      //Back
      $(document).on('click', '.mobile-navigation__top-navigation--back', function() {
        $(this).parent('.mobile-navigation__top-navigation--sub').removeClass('active');
      })
    },

    /*
    / Cookie
    */

    // ------
    // Grava um Cookie
    // PFTX.modules.cookie.set([string]nomeDoCookie, [string]valorDoCookie, [integer]DiasParaExpirar, [string]Caminho)
    // ------
    setCookie: function(cname, cvalue, exdays, path) {
      var _path = path || "/";
      var _exdays = exdays || 1;
      var d = new Date();
      d.setTime(d.getTime() + (_exdays * 24 * 60 * 60 * 1000));
      var expires = "expires=" + d.toGMTString();
      document.cookie = cname + "=" + cvalue + "; " + expires + "; path=" + _path;
    },

    // ------
    // Pega os dados de um Cookie
    // get([string]nomeDoCookie)
    // ------
    getCookie: function(cname) {
      var name = cname + "=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) === 0) 
          return c.substring(name.length, c.length);
        }
      
      return "";
    },

    // ------
    // Remove um cookie
    // remove([string]nomeDoCookie, [string]Caminho)
    // ------
    removeCookie: function(cname, path) {
      var _path = path || "/";
      document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + _path;
    },

    //HelloBar
    helloBar: function() {
      var _that = this;
      var helloBar = function(media) {
        return [
          '<div class="hello-bar ' + media + '">',
          '<div class="row">',
          '<div class="container">',
          '<span>Estamos de site novo. Para efetuar compras, <strong>crie um novo cadastro!</strong></span>',
          '<a href="#" id="toggleCadastre-se" class="hello-bar__btn">Clique aqui</a>',
          // '<a href="#" alt="fechar" class="hello-bar--close">Fechar</a>',
          '</div>',
          '</div>',
          '</div>'
        ].join(' ');
      }

      // if (!_that.getCookie('helloBar') && $('.hello-bar').length === 0) {
      //   $('html').addClass('has-hello-bar');
      //
      // }
      //
      $('#headerBar').append(helloBar('hidden-xs hidden-sm hidden-md'));
      $('#page').prepend(helloBar('visible-md visible-sm visible-xs'));

      //Fechar
      $('.hello-bar').on('click', '.hello-bar--close', function(e) {
        e.preventDefault();
        $('.hello-bar').slideUp('fast');
        $('html').removeClass('has-hello-bar');
        _that.setCookie('helloBar', 'true', 0.04);
      });

      //Toggle cadastre-se
      $('.hello-bar').on('click', '.hello-bar__btn', function(e) {
        e.preventDefault();
        $('#CC-loginHeader-login').click();
      });
    }
  };
});
