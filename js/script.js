(function($){
  var posts = [
    {
      title: '抛砖引玉：教你扩展一个多 Agent 智能平台，并配套落地强风格化前端',
      url: '/2026/06/05/agent-platform-frontend-showcase/',
      excerpt: 'Vue、FastAPI、LangGraph、多 Agent、RAG、Text2SQL、SSE 流式响应与 Codex 前端落地实践。',
      tags: ['项目实战', '多 Agent', 'LangGraph', 'FastAPI', '强风格化前端']
    },
    {
      title: 'AI Agent 开发入门教程：从概念到第一个可运行项目',
      url: '/2026/06/05/ai-agent-getting-started/',
      excerpt: '面向实操的 Agent 入门地图，覆盖工具链选择、RAG、质量验证、项目拆解和第一个可运行项目。',
      tags: ['AI Agent', 'LangChain', 'RAG', 'Vibe Coding', '前端开发']
    }
  ];

  var initTheme = function(){
    var savedTheme = window.localStorage && localStorage.getItem('blog-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = savedTheme || (prefersDark ? 'dark' : 'light');

    $('html').attr('data-theme', theme);

    var $button = $('<button class="nav-icon theme-toggle" type="button" aria-label="切换深浅色"><span class="fa"></span></button>');
    $('#sub-nav .nav-search-btn').before($button);

    var syncButton = function(){
      var isDark = $('html').attr('data-theme') === 'dark';
      $button.attr('title', isDark ? '切换到浅色' : '切换到深色');
      $button.find('.fa').removeClass('fa-moon-o fa-sun-o').addClass(isDark ? 'fa-sun-o' : 'fa-moon-o');
    };

    $button.on('click', function(event){
      event.stopPropagation();
      var nextTheme = $('html').attr('data-theme') === 'dark' ? 'light' : 'dark';
      $('html').attr('data-theme', nextTheme);
      if (window.localStorage) localStorage.setItem('blog-theme', nextTheme);
      syncButton();
    });

    syncButton();
  };

  var initSearch = function(){
    var $legacyWrap = $('#search-form-wrap');
    var $legacyInput = $('.search-form-input');

    var $dialog = $(
      '<div class="search-dialog" role="dialog" aria-modal="true" aria-label="站内搜索">' +
        '<div class="search-dialog-panel">' +
          '<button class="search-dialog-close" type="button" aria-label="关闭搜索"><span class="fa fa-times"></span></button>' +
          '<div class="search-dialog-head">' +
            '<span>Search Notes</span>' +
            '<strong>搜索文章、标签和关键词</strong>' +
          '</div>' +
          '<form class="search-dialog-form">' +
            '<span class="fa fa-search" aria-hidden="true"></span>' +
            '<input class="search-dialog-input" type="search" placeholder="输入 Agent、RAG、FastAPI...">' +
          '</form>' +
          '<div class="search-quick-tags" aria-label="快捷标签"></div>' +
          '<div class="search-result-list" aria-live="polite"></div>' +
        '</div>' +
      '</div>'
    );

    $('body').append($dialog);

    var $input = $dialog.find('.search-dialog-input');
    var $results = $dialog.find('.search-result-list');
    var $quickTags = $dialog.find('.search-quick-tags');
    var allTags = [];

    posts.forEach(function(post){
      post.tags.forEach(function(tag){
        if (allTags.indexOf(tag) === -1) allTags.push(tag);
      });
    });

    allTags.slice(0, 8).forEach(function(tag){
      $quickTags.append('<button type="button" data-query="' + tag + '">' + tag + '</button>');
    });

    var normalize = function(value){
      return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    };

    var renderResults = function(query){
      var keyword = normalize(query);
      var matched = posts.filter(function(post){
        var haystack = normalize([post.title, post.excerpt, post.tags.join(' ')].join(' '));
        return !keyword || haystack.indexOf(keyword) !== -1;
      });

      if (!matched.length) {
        $results.html('<p class="search-empty">没有找到匹配内容。可以换一个关键词，或去归档里慢慢翻。</p>');
        return;
      }

      $results.html(matched.map(function(post){
        return '<a class="search-result-item" href="' + post.url + '">' +
          '<strong>' + post.title + '</strong>' +
          '<span>' + post.excerpt + '</span>' +
          '<em>' + post.tags.slice(0, 4).join(' / ') + '</em>' +
        '</a>';
      }).join(''));
    };

    var openSearch = function(seed){
      $legacyWrap.removeClass('on');
      $dialog.addClass('is-open');
      $('body').addClass('search-open');
      renderResults(seed || '');
      window.setTimeout(function(){
        $input.val(seed || '').focus();
      }, 80);
    };

    var closeSearch = function(){
      $dialog.removeClass('is-open');
      $('body').removeClass('search-open');
      $input.val('');
    };

    $('.nav-search-btn').off('click').on('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      openSearch('');
    });

    $legacyInput.off('blur');

    $dialog.find('.search-dialog-close').on('click', closeSearch);
    $dialog.on('click', function(event){
      if (event.target === this) closeSearch();
    });
    $dialog.find('.search-dialog-form').on('submit', function(event){
      event.preventDefault();
      renderResults($input.val());
    });
    $input.on('input', function(){
      renderResults(this.value);
    });
    $quickTags.on('click', 'button', function(){
      var query = $(this).data('query');
      $input.val(query).focus();
      renderResults(query);
    });

    $(document).on('keydown', function(event){
      if (event.key === 'Escape' && $dialog.hasClass('is-open')) closeSearch();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch('');
      }
    });
  };

  var initArticleEnhancements = function(){
    $('.article-entry').each(function(){
      var $entry = $(this);

      $entry.find('img').each(function(){
        var alt = this.alt;
        if (alt && !$(this).next('.caption').length) $(this).after('<span class="caption">' + alt + '</span>');
      });

      $entry.find('table').not('figure.highlight table, .diagram-card table').each(function(){
        var $table = $(this);
        if ($table.parent('.article-table-wrap').length) return;
        $table.wrap('<div class="article-table-wrap"></div>');
      });

      $entry.find('h2[id], h3[id], h4[id]').each(function(){
        var $heading = $(this);
        $heading.addClass('copyable-heading');
        $heading.find('.headerlink').attr('aria-label', '复制此段链接').attr('title', '复制链接');
      });
    });
  };

  var initReadingProgress = function(){
    if (!$('body').hasClass('is-post-page')) return;

    var $progress = $('<div class="reading-progress" aria-hidden="true"><span></span></div>');
    $('body').append($progress);

    var updateProgress = function(){
      var article = $('.article-entry')[0];
      if (!article) return;

      var start = $(article).offset().top;
      var end = start + $(article).outerHeight() - window.innerHeight;
      var current = window.pageYOffset;
      var ratio = end <= start ? 1 : Math.min(1, Math.max(0, (current - start) / (end - start)));
      $progress.find('span').css('transform', 'scaleX(' + ratio + ')');
    };

    $(window).on('scroll resize', updateProgress);
    updateProgress();
  };

  var initToc = function(){
    var $toc = $('.article-toc');
    if (!$toc.length) return;

    var $button = $('<button class="toc-toggle" type="button"><span class="fa fa-list-ul"></span> 文章目录</button>');
    $toc.prepend($button);
    if (window.innerWidth <= 1100) $toc.addClass('is-collapsed');

    $button.on('click', function(){
      $toc.toggleClass('is-collapsed');
    });

    var links = $toc.find('a[href^="#"]').toArray();
    var headings = links.map(function(link){
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      return document.getElementById(id);
    }).filter(Boolean);

    var escapeSelector = function(value){
      if (window.CSS && CSS.escape) return CSS.escape(value);
      return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    };

    var setActive = function(){
      var activeId = '';
      headings.forEach(function(heading){
        if (heading.getBoundingClientRect().top < 140) activeId = heading.id;
      });
      if (!activeId && headings[0]) activeId = headings[0].id;
      $toc.find('a').removeClass('is-active');
      if (activeId) {
        $toc.find('a[href="#' + escapeSelector(activeId) + '"]').addClass('is-active');
      }
    };

    $(window).on('scroll resize', setActive);
    setActive();
  };

  var getCodeText = function($block){
    var $lines = $block.find('td.code .line, pre .line');
    if ($lines.length) {
      return $lines.map(function(){ return $(this).text(); }).get().join('\n').replace(/\n+$/, '');
    }
    return $block.find('pre').first().text().replace(/\n+$/, '');
  };

  var copyText = function(text, callback){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(callback);
      return;
    }
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    callback();
  };

  var initCodeCopy = function(){
    $('.article-entry figure.highlight, .article-entry > pre').each(function(){
      var $block = $(this);
      if ($block.find('.code-copy').length) return;

      var $button = $('<button class="code-copy" type="button"><span class="fa fa-copy"></span>复制</button>');
      $block.addClass('code-copy-wrap').append($button);

      $button.on('click', function(){
        copyText(getCodeText($block), function(){
          $button.addClass('is-copied').html('<span class="fa fa-check"></span>已复制');
          window.setTimeout(function(){
            $button.removeClass('is-copied').html('<span class="fa fa-copy"></span>复制');
          }, 1600);
        });
      });
    });
  };

  var initHeadingCopy = function(){
    $('.article-entry').on('click', '.headerlink', function(event){
      var href = this.getAttribute('href');
      if (!href) return;

      event.preventDefault();
      var url = window.location.origin + window.location.pathname + href;
      copyText(url, function(){
        var $link = $(event.currentTarget);
        $link.addClass('is-copied');
        window.history.replaceState(null, '', href);
        window.setTimeout(function(){
          $link.removeClass('is-copied');
        }, 1200);
      });
    });
  };

  var initBackToTop = function(){
    var $button = $('<button class="back-to-top" type="button" aria-label="回到顶部"><span>↑</span></button>');
    $('body').append($button);

    var toggleBackToTop = function(){
      $button.toggleClass('is-visible', window.pageYOffset > 480);
    };

    $button.on('click', function(){
      $('html, body').stop().animate({ scrollTop: 0 }, 520);
    });

    $(window).on('scroll', toggleBackToTop);
    toggleBackToTop();
  };

  var initLibraryFilter = function(){
    var $library = $('.article-library');
    var $items = $library.find('.latest-item');
    if (!$library.length || !$items.length) return;

    var tags = [];
    $items.each(function(){
      var $item = $(this);
      var itemTags = $item.find('.latest-tags a').map(function(){
        return $(this).text().trim();
      }).get();
      $item.attr('data-tags', itemTags.join('|'));
      itemTags.forEach(function(tag){
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });

    var $filters = $('<div class="library-filters" aria-label="按标签筛选文章"></div>');
    $filters.append('<button type="button" class="is-active" data-tag="all">全部</button>');
    tags.forEach(function(tag){
      $filters.append('<button type="button" data-tag="' + tag + '">' + tag + '</button>');
    });
    $library.find('.library-stats').after($filters);
    $library.find('.library-list').after('<p class="library-empty">这个标签下暂时没有文章。</p>');

    var applyFilter = function(tag){
      var visibleCount = 0;
      $filters.find('button').removeClass('is-active');
      $filters.find('[data-tag="' + tag + '"]').addClass('is-active');

      $items.each(function(){
        var $item = $(this);
        var match = tag === 'all' || ($item.attr('data-tags') || '').split('|').indexOf(tag) !== -1;
        $item.toggleClass('is-hidden', !match);
        if (match) visibleCount += 1;
      });

      $library.find('.library-empty').toggleClass('is-visible', visibleCount === 0);
    };

    $filters.on('click', 'button', function(){
      applyFilter($(this).data('tag'));
    });

    $library.on('click', '.latest-tags a', function(event){
      event.preventDefault();
      applyFilter($(this).text().trim());
      document.getElementById('latest-posts-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  var initReveal = function(){
    var $targets = $('.reveal-panel, .featured-card, .latest-item, .article-inner, .article-source-card, .article-brief');
    if (!$targets.length) return;

    if (!('IntersectionObserver' in window)) {
      $targets.addClass('is-revealed');
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        $(entry.target).addClass('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    $targets.each(function(index){
      $(this).css('transition-delay', Math.min(index * 35, 220) + 'ms');
      observer.observe(this);
    });
  };

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

  var initMobileMenu = function(){
    var $container = $('#container');
    var isSiteMenuAnim = false;
    var siteMenuAnimDuration = 200;

    var startSiteMenuAnim = function(){
      isSiteMenuAnim = true;
    };

    var stopSiteMenuAnim = function(){
      setTimeout(function(){
        isSiteMenuAnim = false;
      }, siteMenuAnimDuration);
    };

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
  };

  initTheme();
  initSearch();
  initArticleEnhancements();
  initReadingProgress();
  initToc();
  initCodeCopy();
  initHeadingCopy();
  initBackToTop();
  initLibraryFilter();
  initReveal();
  initArticleDiagrams();
  initMobileMenu();
  $('body').addClass('is-ready');
})(jQuery);
