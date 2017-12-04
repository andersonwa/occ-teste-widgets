/**
 * @fileoverview Mega Menu Widget.
 *
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'ccConstants', 'notifications', 'pubsub', 'CCi18n','spinner'],
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, CCConstants, notifications, pubsub, CCi18n,spinner) {

    "use strict";

    return {

      categories: ko.observableArray(),
      // Spinner resources
      catalogMenuBlock: '#CC-megaMenu',
      menuOptions: {
        parent: '#CC-megaMenu',
        posTop: '40px',
        posLeft: '30%'
      },
      
      onLoad: function(widget) {

        widget.categories.isData = true;
        widget.menuName = 'CC-CategoryNav';

        widget.isMobile = ko.observable(false);
        
        $(window).resize(function(){
          widget.checkResponsiveFeatures($(window).width());
        });
        $(document).on('mouseover','li.cc-desktop-dropdown', function() {
          $(this).children('ul.dropdown-menu').css({'display': 'block', 'top': 'auto'});
          if (navigator.userAgent.indexOf("Firefox") != -1) {
            $("#CC-product-listing-sortby-controls select.form-control").hide();
          }
          else {
            $("#CC-product-listing-sortby-controls select.form-control").css('visibility', 'hidden');
          }
        });
        $(document).on('mouseout','li.cc-desktop-dropdown', function() {
          $(this).children('ul.dropdown-menu').css({'display': 'none'});
          if (navigator.userAgent.indexOf("Firefox") != -1) {
            $("#CC-product-listing-sortby-controls select.form-control").show();
          }
          else {
            $("#CC-product-listing-sortby-controls select.form-control").css('visibility', 'visible');
          }
        });
        $(document).on('keydown','a.Level1', function (event) {
            if (event.which === 9 && event.shiftKey) {
              $(this).next('ul.dropdown-menu').css({'display': 'none'}); 
            } else if (event.which == 27) {
              $(this).next('ul.dropdown-menu').css({'display': 'none'}); 
            } else if (event.which == 9) {
              $(this).next().children('a.Level2').parents('ul.dropdown-menu').css({'display': 'block', 'top': 'auto'});
            } else if (event.which == 13) {
              $(this).next('ul.dropdown-menu').css({'display': 'none'});  
            }
        });
        $(document).on('keydown','a.Level2', function (event) {
          if (event.which == 27) {
            $(this).parents('ul.dropdown-menu').css({'display': 'none'}); 
          } else if (event.which == 9) {
            $(this).next().children('a.Level3').parents('ul.dropdown-menu').css({'display': 'block', 'top': 'auto'});
          } else if (event.which == 13) {
            $(this).parents('ul.dropdown-menu').css({'display': 'none'});  
          }
        });
        $(document).on('keydown','a.Level3', function (event) {
          if (event.which == 27) {
            $(this).parents('ul.dropdown-menu').css({'display': 'none'});
          } else if (event.which == 9) {
            if ($(this).parent('li').next('li').children('a.Level3').length !=0 || $(this).parents('div.child-category-container').next('div.child-category-container').children('a.Level2').length !=0) {
            } else {
              $(this).parents('ul.dropdown-menu').parent('li.cc-desktop-dropdown').next('li.cc-desktop-dropdown').focus();
            }
          } else if (event.which == 13 && navigator.userAgent.indexOf("MSIE") == -1 && !navigator.userAgent.match(/Trident.*rv\:11\./)) {
            $(this).parents('ul.dropdown-menu').css({'display': 'none'});
          }
        });
        $(document).on('blur','a.Level3', function (event) {
          if ($(this).parent('li').next('li').children('a.Level3').length !=0 || $(this).parents('div.child-category-container').next('div.child-category-container').children('a.Level2').length !=0) {
          } else {
            $(this).parents('ul.dropdown-menu').css({'display': 'none'}); 
          } 
        });
        $(document).on('focus','li.cc-desktop-dropdown', function () {
          $(this).children('ul.dropdown-menu').css({'display': 'block', 'top': 'auto'});
        });
        if(widget.user()!= undefined && widget.user().catalogId) {
          widget.catalogId(widget.user().catalogId());
        }
        widget.setCategoryList();  

      },

      /**
       * Updates categories if user catalog changes.
       */
      beforeAppear: function (page) {
        var widget = this;

        if(ko.isObservable(widget.user) && widget.user() &&
           ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
          if(widget.user().catalogId() != widget.catalogId()) {
            widget.categories('');
            widget.createSpinner();
            widget.catalogId(widget.user().catalogId());
            widget.setCategoryList();
            widget.destroySpinner();
          }
        }
      },

      /**
       * Get the categories for the catalog and set it to the widget.
       */
      setCategoryList : function() {
    	var widget = this;
        //Load the categoryList
        widget.load('categoryList',
        [widget.rootCategoryId(), widget.catalogId(), 1000, widget.fields()],
        function(result) {

          widget.checkResponsiveFeatures($(window).width());
          
          var level, i, arraySize, maxElementCount; 
          level = 1;
          arraySize = result.length;
          maxElementCount = parseInt(widget.maxNoOfElements(),1000);
           
          if ( arraySize > maxElementCount){
            arraySize = maxElementCount;
            result = result.slice(0, maxElementCount );
          }
          // loop round the maximum number of time
          for (i = 0; i < arraySize; i+=1) {
            widget.setUiIdentifier(result[i], widget.menuName, level, i, widget.navigationCategoryClick, maxElementCount);
            widget.setAriaLabelText(result[i]);
          }
            
          widget.categories(result);  
        },
        widget);    	  
      },

      /**
       * Destroy spinner.
       */
      destroySpinner : function() {
        var widget = this;
        $(widget.catalogMenuBlock).removeClass('loadingIndicator');
        spinner.destroy(1);
      },

      /**
       * Creates spinner.
       */
      createSpinner : function() {
        var widget = this;
        $(widget.catalogMenuBlock).css('position','relative');
        widget.menuOptions.loadingText = 'Loading';
        spinner.create(widget.menuOptions);
      },
      
      /**
       * Menu items click event used to set focus to product listing result section
       * 
       * data - knockout data 
       * event - event data
       */
      catMenuClick: function(data, event) {
        $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{message: "success"}]);
        $.Topic(pubsub.topicNames.UPDATE_FOCUS).publishWith({WIDGET_ID: "productListing"}, [{message: "success"}]);
        return true;
      },
      
      checkResponsiveFeatures : function(viewportWidth) {
        if(viewportWidth > 978) {
          this.isMobile(false);
        }   
        else if(viewportWidth <= 978){
          this.isMobile(true);
        }
      },

      /**
     * Recursive function to traverses the collection and set a UI Identifier
     * 
     * pCurrCollection - the current collection
     * pCollectionsArray - the array to hold all the collections
     * pLevel - the level we are currently at in the tree.
     * pCount - the current count
     * pKeypressFunc - the key press function to execute
     * pSubmenuClickFunc - the sub drop down menu click function, used to display the drop down submenu 
     * pOtherClick - the click function for other menu items, used to clear the drop down submenu
     * pMaxElementCount - the maximum number of categories to display.   
     */ 
    setUiIdentifier: function( pCurrCollection, pMenuName, pLevel, pCount, pSubmenuClickFunc, pMaxElementCount){
      
      var children, element, child, maxIterations ;
        
      pCurrCollection.uiIdentifier = pMenuName  + '_' + (pCount + 1).toString() ; 
      pCurrCollection.level = pLevel;
      pCurrCollection.itemIndex = pCount + 1;
      pCurrCollection.hasChildCategories = false;
      pCurrCollection.levelClass = 'Level' + pLevel.toString();
      
      // add the functions to the object so we can access them on the template
      // because this is recursive it is difficult to access the function via knockout 
      pCurrCollection.subSubmenuClickFunc = pSubmenuClickFunc;
      
      children = pCurrCollection.childCategories;
      
      if ((typeof(children) !== "undefined") && (children !== null)) {
        
        pCurrCollection.hasChildCategories = true;
        maxIterations = children.length;
                  
        if ( maxIterations > pMaxElementCount){
          maxIterations = pMaxElementCount;
          
          pCurrCollection.childCategories = pCurrCollection.childCategories.slice(0, pMaxElementCount );
        }
        // loop round the maximum number of time
        for (var i = 0; i < maxIterations; i+=1) {
          child = pCurrCollection.childCategories[i];
          this.setUiIdentifier(child, pMenuName + '_' + (pCount + 1).toString(), pLevel + 1, i, pSubmenuClickFunc, pMaxElementCount);
          this.setAriaLabelText(child);
          
        }
      }
    },    
    /**
     * Recursive function to traverses the collection and set a aria label atribute
     * 
     * pCurrCollection - the current collection
     */
    setAriaLabelText: function( pCurrCollection){
       
      var children = pCurrCollection.childCategories;
      if ((typeof(children) !== "undefined") && (children !== null)) {
        pCurrCollection.ariaLabelText =  CCi18n.t('ns.megaMenu:resources.categoryNavScreenReaderText', 
                  {categoryLength: children.length, displayName:pCurrCollection.displayName}); 
      }else{
        pCurrCollection.ariaLabelText =  CCi18n.t('ns.megaMenu:resources.noSubCategoriesText', 
                  {displayName:pCurrCollection.displayName}); 
      }
    },
    /**
     * sub sub menu click event - key press event handle
     * 
     * data - knockout data 
     * event - event data
     */ 
    navigationCategoryClick : function(data, event) {
      notifications.emptyGrowlMessages();
      var $this, parent;
      
      event.stopPropagation();
      
      $this = $(event.target).parent("li");
      parent = $this.parent().parent();
      
      if ($(event.target).parent().hasClass('dropdown-submenu') ) {
        event.preventDefault();
      }
      
      if($this.hasClass('open')) {
        // Closes previously open categories
        $this.removeClass('open').addClass('closed');

      } else {
        if(parent.hasClass('open')) {
          $('.dropdown-submenu.open').removeClass('open').addClass('closed');
          if($this.hasClass('closed')) {
            // Opens a previously closed category
            $this.removeClass('closed').addClass('open');
            return false;
          } else {
            $this.removeClass('open').addClass('closed');
          }
        }
      }
      
      return true;
    },

    megaMenuClick : function (data, event) {
      notifications.emptyGrowlMessages();
      $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{message: "success"}]);  
      event.stopPropagation();
      return true;
    }
    
  };
});
