/**
 * @fileoverview Category navigation Widget. 
 * 
 */
define(
  
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'ccConstants', 'jquery', 'CCi18n', 'pubsub', 'ccStoreConfiguration'],
  
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(ko, CCConstants, $, CCi18n, pubsub, CCStoreConfiguration) {
  
  "use strict";
  
  return {
    
    categories: ko.observableArray(),
    storeConfiguration: CCStoreConfiguration.getInstance(),

    /**
      Category navigation Widget.
      @private
      @property {observable object} categories 
      @property menuName
     */    
    onLoad: function(widget) {
            
      widget.categories.isData = true;
      widget.menuName = 'CC-CategoryNav';
      
      if (widget.user().catalog != undefined) {
        widget.catalogId(widget.user().catalog.repositoryId);
        if (widget.user().catalog.rootCategories != undefined && widget.user().catalog.rootCategories.length > 0) {
          widget.rootCategoryId(widget.user().catalog.rootCategories[0].id);
        }
      }

      var params = {};
      var contextObj = {};
      contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_COLLECTIONS_GET_COLLECTION;
      contextObj[CCConstants.IDENTIFIER_KEY] = "categoryNavigation";
      var filterKey = widget.storeConfiguration.getFilterToUse(contextObj);
      if (filterKey) {
        params[CCConstants.FILTER_KEY] = filterKey;
      }
      //Load the categoryList
      widget.load(
        'categoryList',
        [widget.rootCategoryId(), widget.catalogId(), CCConstants.CATALOG_MAX_LEVEL, widget.fields()], params,
        function(result) {
          
          var level, i, arraySize, maxElementCount; 
          level = 1;
          arraySize = result.length;
          maxElementCount = parseInt(widget.maxNoOfElements(),10);
          
          if ( arraySize > maxElementCount) {
            arraySize = maxElementCount;
            
            result = result.slice(0, maxElementCount );
          }
          // loop round the maximum number of time
          for (i = 0; i < arraySize; i+=1) {
            widget.setUiIdentifier(result[i], widget.menuName, level, i, widget.keypressHandler, 
              widget.navigationCategoryFocus, maxElementCount, widget.mouseEnter, widget.checkOpenMenus,
              widget.positionDropdown, null);            
          }
          
          widget.categories(result);          
        },
        widget);
      
      $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.closeAllSubMenu.bind(this));
    },
    
    /**
     * Function to close all open category/subcategory menu
     * data - root level menu item 
     */ 
    closeAllSubMenu : function(data) {
      var self = this;
      var rootCategories = $($("#region-megaMenu li")[0]).siblings();
      self.checkOpenMenus(rootCategories);
    },
    /**
     * Recursive function to traverses the collection and set a UI Identifier
     * 
     * pCurrCollection - the current collection
     * pCollectionsArray - the array to hold all the collections
     * pLevel - the level we are currently at in the tree.
     * pCount - the current count
     * pKeypressFunc - the key press function to execute
     * pOnMenuFocus - the sub drop down menu focus function, used to display the drop down submenu 
     * pOtherClick - the click function for other menu items, used to clear the drop down submenu
     * pMaxElementCount - the maximum number of categories to display.   
     */ 
    setUiIdentifier: function( pCurrCollection, pMenuName, pLevel, pCount, pKeypressFunc, pOnMenuFocus, 
        pMaxElementCount, pMouseEnterEvent, pCheckOpenMenus, pPositionDropdown, pParent) {
      
      var children, element, child, maxIterations ;

      // set traversing to 4 levels in the tree structure, 
      // stops it going into an infinite loop
      if (pLevel <= CCConstants.CATALOG_MAX_LEVEL) {
        
        pCurrCollection.uiIdentifier = pMenuName  + '_' + (pCount + 1).toString() ; 
        pCurrCollection.level = pLevel;
        pCurrCollection.itemIndex = pCount + 1;
        pCurrCollection.hasChildCategories = false;
        pCurrCollection.levelClass = 'Level' + pLevel.toString();
        pCurrCollection.subMenuToRight = true; // default
         
        // add the functions to the object so we can access them on the template
        // because this is recursive it is difficult to access the function via knockout 
        pCurrCollection.keybindFunc = pKeypressFunc;
        pCurrCollection.onMenuFocus = pOnMenuFocus;
        pCurrCollection.checkOpenMenus = pCheckOpenMenus;
        pCurrCollection.mouseEnterFunc = pMouseEnterEvent;
        pCurrCollection.positionDropdown = pPositionDropdown;
        pCurrCollection.parent = pParent;
        
        if (pLevel == CCConstants.CATALOG_MAX_LEVEL) {
          pCurrCollection.childCategories = null;
        }
        
        children = pCurrCollection.childCategories;
        
        if ((typeof(children) !== "undefined") && (children !== null)) {
          
          pCurrCollection.hasChildCategories = true;
          maxIterations = children.length;
                    
          if ( maxIterations > pMaxElementCount) {
            maxIterations = pMaxElementCount;
            
            pCurrCollection.childCategories = pCurrCollection.childCategories.slice(0, pMaxElementCount );
          }
          // loop round the maximum number of time
          for (var i = 0; i < maxIterations; i+=1) {
            child = pCurrCollection.childCategories[i];
            this.setUiIdentifier(child, pMenuName + '_' + (pCount + 1).toString(), pLevel + 1, i, pKeypressFunc, pOnMenuFocus, 
              pMaxElementCount, pMouseEnterEvent, pCheckOpenMenus, pPositionDropdown, pCurrCollection);
            
          }
        }
      }
      
    },
    /**
     * key press event handle
     * 
     * data - knockout data 
     * event - event data
     */ 
    keypressHandler : function(data, event){

        var self, $this, currentId, childMenuId, childLinkItemId, parentMenuItemId, topLevel, nextMenuItemId, previousMenuItemId, 
                nextCategory, previousCategory, currentMenuId, keyCode;
        
        var level = data.level;
        self = this; 
        $this = $(event.target);              
        
        currentId = '#' + $this.attr('id');
        childMenuId = currentId  + '_submenu';
        childLinkItemId = currentId + '_1';
        parentMenuItemId = currentId.substr(0, currentId.lastIndexOf("_"));
        topLevel = (parentMenuItemId === '#CC-CategoryNav') ;
        nextMenuItemId = parentMenuItemId + '_' + (parseInt( currentId.substr(currentId.lastIndexOf("_")+ 1), 10) + 1);
        nextCategory = $($this[0]).parent("li")[0].nextElementSibling;
        previousCategory = $($this[0]).parent("li")[0].previousElementSibling;
        previousMenuItemId = parentMenuItemId + '_' + (parseInt( currentId.substr(currentId.lastIndexOf("_")+ 1), 10) - 1);
        var nSplit = currentId.split("_"); 
        var topLevelParent = nSplit[0] + "_" + nSplit[1]; 
        currentMenuId = parentMenuItemId + '_submenu';
        
        keyCode = event.which ? event.which : event.keyCode;

        if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
          keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
        }
         
        function select_parent() {
          // hide the sub sub menu
          if (level > 2) {
            $(parentMenuItemId).parent('li') .removeClass('open').addClass('closed');
            $(parentMenuItemId).focus();
          }
          
        }
        
        function select_parent_next() {
          if (topLevel && nextCategory) {
            $(nextMenuItemId).focus();
            close_submenu();
          } else if(!topLevel) {
            return false;
          } else {
            var id = $this.parents('div[id^="region"]')[0].nextElementSibling.id;
            var idGen = "#"+id+" :focusable";
            close_submenu();
            $(idGen).first().focus(); 
          } 
        }
        
        function select_parent_previous() {
          if (topLevel && previousCategory) {
            $(previousMenuItemId).focus();       
            close_submenu();
          } else if(!topLevel) {
            return false;
          } else {
            var id = $this.parents('div[id^="region"]')[0].previousElementSibling.id;
            var idGen = "#"+id+" :focusable";
            $(idGen).last().focus(); 
          }
        }
        
        function select_previous() {          
          event.stopPropagation();
          if ($(previousMenuItemId).length) {
            event.preventDefault();        
            $(previousMenuItemId).focus();                        
          } else if (level === 2 ) {            
            $(parentMenuItemId).parent('li') .removeClass('open').addClass('closed');
            $(parentMenuItemId).focus();
          } 
        }

        function select_next() {
          
          if (topLevel) {
            event.stopPropagation();
            if ($($this[0]).parent("li").children("ul").children("li")) {
              var id =  $($this[0]).parent("li").children("ul").children("li")[0].id;          
              var idGen = "#"+id+" :focusable";
              $(idGen).first().focus();
            }
          } else if (nextCategory) {
            event.stopPropagation();
              
            if (level === 2) {
              $(nextCategory).prev('li').removeClass('open').addClass('closed');
              $(nextMenuItemId).focus();
            } else {
              $(nextMenuItemId).focus();
              close_submenu();
            }
          }          
        }

        function select_child() {          
          if ($($this[0]).parent("li").children("ul").length > 0) {
            var id =  $($this[0]).parent("li").children("ul")[0].id;          
            var idGen = "#"+id+" :focusable";
            $(idGen).first().focus(); 
          }
        }
        
        function close_submenu() {
          $($this[0]).parent("li").removeClass('open').addClass('closed');
        }
        
        function open_dropdown() {
          // check in here to see if it a drop down submenu
          // the default click event is removing the parent menu's open class 
          if (! ($this.parent('li').hasClass('dropdown-submenu') || $this.parent('li').hasClass('dropdown'))) {
            $this.click();
          }  
        }
        
        function has_children() {
          if ($($this[0]).parent("li").children("ul").length > 0) {
            return true;
          }
          return false;
        }
        
        switch(keyCode) {
          case CCConstants.KEY_CODE_ENTER:
           break;
            
          case CCConstants.KEY_CODE_SPACE:
            if ($($this[0]).parent("li").hasClass('open')) {
              close_submenu();
            } else {
              event.stopPropagation();
              $($this[0]).parent("li").addClass('open');
              self.positionDropdown();
            }            
            event.stopPropagation();
            break;
            
          case CCConstants.KEY_CODE_TAB:
            select_parent_next();
            return false;
            break;            
            
          case CCConstants.KEY_CODE_SHIFT_TAB:
            select_parent_previous();            
            return false;
            break;            
            
          case CCConstants.KEY_CODE_LEFT_ARROW:
            // left arrow
            if (!topLevel) {
              if (has_children()) {
                if (!data.subMenuToRight) {
                  select_child();
                }
              } else {
                if (data.parent != null && data.parent.subMenuToRight) {
                  select_parent();
                }
              }
            } 
            break;
            
          case CCConstants.KEY_CODE_UP_ARROW:
            
            close_submenu();
            // Up arrow
            if (! topLevel) {              
              select_previous();
            } 
            return false;
            break;
   
          case CCConstants.KEY_CODE_RIGHT_ARROW:
            // right arrow
            if (!topLevel) {
              if (has_children()) {
                if (data.subMenuToRight) {
                  select_child();
                }
              } else {
                if (data.parent != null && !data.parent.subMenuToRight) {
                  select_parent();
                }
              }
            } else {
              select_next();
            }
            break;
            
          case CCConstants.KEY_CODE_DOWN_ARROW:
            if (!$(currentId).parent("li").hasClass('open') && topLevel) {
              event.stopPropagation();
              $(currentId).parent("li").addClass('open');              
            } else {
              select_next();
            } 
            return false;
        }
        
        return true;      
    },
    /**
     * focus event - key press event handle
     * 
     * data - knockout data 
     * event - event data
     */ 
    navigationCategoryFocus : function(data, event) {
      var $this, parent;
      
      event.stopPropagation();
      
      $this = $(event.target).parent("li");
      parent = $this.parent().parent();
      
      if ($(event.target).parent().hasClass('dropdown-submenu') ) {
        event.preventDefault();
      }

      if ($this.hasClass('open')) {
        $this.removeClass('open').addClass('closed');
      } else {
        event.stopPropagation();
        $this.addClass('open');
        this.positionDropdown();
      }
      
      return true;
    },
    /**
     * mouse Enter event - used to clean up and close 
     * any open sub dropdown menus if we have one open  
     * 
     * data - knockout data 
     * event - event data
     */    
    mouseEnter : function(data, event) {
      //var self = this
      var $this = $(event.target); 
      var siblings = $($this[0]).parent("li").siblings();
      this.checkOpenMenus(siblings);
      this.positionDropdown();
    },
    

    /**
     * Recursive function to check all the menu dropdowns and close if any of the category/subcategory menu is open
     * data - root level menu item 
     */ 
    checkOpenMenus : function(data) {
      
      var siblings = data;
      var siblingsLength = siblings.length;
      for (var i = 0; i < siblingsLength; i+=1) {
        if ($(siblings[i]).hasClass('open')) {
          $(siblings[i]).removeClass('open').addClass('closed');
        }
        var siblingsChild = $(siblings[i]).children("ul").children("li");
        this.checkOpenMenus(siblingsChild);
      }
      return false;
    },
    
    positionDropdown : function() {
      var dropdown = $('#'+this.uiIdentifier+'_submenu');
    
      if (dropdown.length > 0 && this.subMenuToRight) {
        var rightPosition = dropdown.offset().left + dropdown.width();
        var bodyWidth = $('body').innerWidth();
        var padding = 3;
      
        if ((rightPosition + padding) > bodyWidth) {
          // display dropdown to left instead of right
          this.subMenuToRight = false;
          
          dropdown.addClass('move-to-left');
          
          $(window).one('resize.bs.dropdown', function () {
            // if the window is resized, then reset the menu
            this.subMenuToRight = true;
            
            var dropdown = $('#'+this.uiIdentifier+'_submenu');
            
            if (dropdown.length > 0) {
              dropdown.removeClass('move-to-left');
            }
                          
          }.bind(this));
        } 
      }
    }
   
  };
});
