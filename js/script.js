(function($){
  var $searchWrap = $('#search-form-wrap'),
    isSearchAnim = false,
    searchAnimDuration = 200;

  var startSearchAnim = function(){
    isSearchAnim = true;
  };

  var stopSearchAnim = function(callback){
    setTimeout(function(){
      isSearchAnim = false;
      callback && callback();
    }, searchAnimDuration);
  };

  $('.nav-search-btn').on('click', function(){
    if (isSearchAnim) return;

    startSearchAnim();
    $searchWrap.addClass('on');
    stopSearchAnim(function(){
      $('.search-form-input').focus();
    });
  });

  $('.search-form-input').on('blur', function(){
    startSearchAnim();
    $searchWrap.removeClass('on');
    stopSearchAnim();
  });

  $('.article-entry').each(function(){
    $(this).find('img').each(function(){
      var alt = this.alt;
      if (alt) $(this).after('<span class="caption">' + alt + '</span>');
    });
  });

  var $container = $('#container'),
    isSiteMenuAnim = false,
    siteMenuAnimDuration = 200;

  var startSiteMenuAnim = function(){
    isSiteMenuAnim = true;
  };

  var stopSiteMenuAnim = function(){
    setTimeout(function(){
      isSiteMenuAnim = false;
    }, siteMenuAnimDuration);
  }

  $('#main-nav-toggle').on('click', function(){
    if (isSiteMenuAnim) return;

    startSiteMenuAnim();
    $container.toggleClass('site-menu-on');
    stopSiteMenuAnim();
  });

  $('#wrap').on('click', function(){
    if (isSiteMenuAnim || !$container.hasClass('site-menu-on')) return;

    $container.removeClass('site-menu-on');
  });
})(jQuery);
