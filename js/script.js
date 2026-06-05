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

    $(this).find('table').not('figure.highlight table, .diagram-card table').each(function(){
      var $table = $(this);
      if ($table.parent('.article-table-wrap').length) return;

      $table.wrap('<div class="article-table-wrap"></div>');
    });
  });

  var initArticleDiagrams = function(){
    var $diagrams = $('.diagram-card');
    if (!$diagrams.length || !window.mermaid) return;

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 38,
        rankSpacing: 56,
        padding: 18
      },
      sequence: {
        actorMargin: 48,
        boxMargin: 12,
        messageMargin: 36,
        mirrorActors: false
      },
      themeVariables: {
        background: '#fffdf7',
        mainBkg: '#fff9ec',
        nodeBkg: '#fff9ec',
        clusterBkg: '#f2fbfa',
        clusterBorder: '#a8dbe1',
        fontFamily: '"Noto Serif SC", "Microsoft YaHei", sans-serif',
        primaryColor: '#fff9ec',
        primaryTextColor: '#274256',
        primaryBorderColor: '#56b7c4',
        lineColor: '#77aebb',
        secondaryColor: '#effbfa',
        tertiaryColor: '#fff4e6',
        noteBkgColor: '#fff7dc',
        noteBorderColor: '#f1c768',
        actorBkg: '#fff9ec',
        actorBorder: '#56b7c4',
        actorTextColor: '#274256',
        signalColor: '#41687b',
        signalTextColor: '#274256'
      }
    });

    window.mermaid.run({ querySelector: '.diagram-card .mermaid' }).then(function(){
      $diagrams.each(function(){
        var $card = $(this);
        var $viewport = $card.find('.diagram-viewport');
        var svg = $viewport.find('svg')[0];
        if (!svg) return;

        svg.removeAttribute('height');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        if (window.innerWidth <= 760) {
          $card.removeClass('is-original').addClass('is-fit');
        }
        if ($viewport[0].scrollWidth > $viewport[0].clientWidth + 4) {
          $card.addClass('is-scrollable');
        }
      });
    }).catch(function(error){
      $diagrams.addClass('is-diagram-error');
      if (window.console) console.warn('Mermaid render failed:', error);
    });
  };

  initArticleDiagrams();

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
