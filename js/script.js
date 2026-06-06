(function(){
  var posts = window.__BLOG_POSTS__ || [];
  var html = document.documentElement;
  var body = document.body;

  var create = function(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  var normalize = function(value) {
    return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  };

  var initTheme = function() {
    var subNav = document.querySelector("#sub-nav");
    var searchButton = document.querySelector(".nav-search-btn");
    if (!subNav || !searchButton) return;

    var button = create("button", "nav-icon theme-toggle");
    button.type = "button";
    button.setAttribute("aria-label", "切换深浅色");
    var symbol = create("span", "theme-symbol");
    symbol.setAttribute("aria-hidden", "true");
    button.appendChild(symbol);
    subNav.insertBefore(button, searchButton);

    var sync = function() {
      var isDark = html.getAttribute("data-theme") === "dark";
      button.title = isDark ? "切换到浅色" : "切换到深色";
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
      symbol.textContent = isDark ? "日" : "月";
    };

    button.addEventListener("click", function(event) {
      event.stopPropagation();
      var next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      html.style.colorScheme = next;
      try {
        localStorage.setItem("blog-theme", next);
      } catch (error) {}
      sync();
    });

    sync();
  };

  var initSearch = function() {
    var openButton = document.querySelector(".nav-search-btn");
    if (!openButton) return;

    var dialog = create("div", "search-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "站内搜索");
    dialog.innerHTML =
      '<div class="search-dialog-panel">' +
        '<button class="search-dialog-close" type="button" aria-label="关闭搜索"><span aria-hidden="true">×</span></button>' +
        '<div class="search-dialog-head"><span>Search Notes</span><strong>搜索文章、标签和关键词</strong></div>' +
        '<form class="search-dialog-form"><span class="nav-search" aria-hidden="true"></span><input class="search-dialog-input" type="search" placeholder="输入 Agent、RAG、FastAPI..."></form>' +
        '<div class="search-quick-tags" aria-label="快捷标签"></div>' +
        '<div class="search-result-list" aria-live="polite"></div>' +
      '</div>';
    body.appendChild(dialog);

    var input = dialog.querySelector(".search-dialog-input");
    var results = dialog.querySelector(".search-result-list");
    var quickTags = dialog.querySelector(".search-quick-tags");
    var closeButton = dialog.querySelector(".search-dialog-close");
    var previousFocus = null;
    var tags = [];

    posts.forEach(function(post) {
      (post.tags || []).forEach(function(tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });

    tags.slice(0, 8).forEach(function(tag) {
      var tagButton = create("button", "", tag);
      tagButton.type = "button";
      tagButton.dataset.query = tag;
      quickTags.appendChild(tagButton);
    });

    var render = function(query) {
      var keyword = normalize(query);
      var matched = posts.filter(function(post) {
        var haystack = normalize([post.title, post.excerpt, (post.tags || []).join(" ")].join(" "));
        return !keyword || haystack.indexOf(keyword) !== -1;
      });

      if (!matched.length) {
        results.innerHTML = '<p class="search-empty">没有找到匹配内容。可以换一个关键词，或去归档里慢慢翻。</p>';
        return;
      }

      results.innerHTML = matched.map(function(post) {
        return '<a class="search-result-item" href="' + post.url + '">' +
          '<strong>' + post.title + '</strong>' +
          '<span>' + post.excerpt + '</span>' +
          '<em>' + (post.tags || []).slice(0, 4).join(" / ") + '</em>' +
        '</a>';
      }).join("");
    };

    var open = function(seed) {
      previousFocus = document.activeElement;
      dialog.classList.add("is-open");
      body.classList.add("search-open");
      render(seed || "");
      window.setTimeout(function() {
        input.value = seed || "";
        input.focus();
      }, 60);
    };

    var close = function() {
      dialog.classList.remove("is-open");
      body.classList.remove("search-open");
      input.value = "";
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };

    openButton.addEventListener("click", function(event) {
      event.preventDefault();
      open("");
    });
    closeButton.addEventListener("click", close);
    dialog.addEventListener("click", function(event) {
      if (event.target === dialog) close();
    });
    dialog.querySelector(".search-dialog-form").addEventListener("submit", function(event) {
      event.preventDefault();
      render(input.value);
    });
    input.addEventListener("input", function() {
      render(input.value);
    });
    quickTags.addEventListener("click", function(event) {
      var button = event.target.closest("button");
      if (!button) return;
      input.value = button.dataset.query || "";
      input.focus();
      render(input.value);
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && dialog.classList.contains("is-open")) close();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open("");
      }
    });
  };

  var copyText = function(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(callback).catch(function(){ fallbackCopy(text, callback); });
      return;
    }
    fallbackCopy(text, callback);
  };

  var fallbackCopy = function(text, callback) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (error) {}
    body.removeChild(textarea);
    callback();
  };

  var initArticleEnhancements = function() {
    document.querySelectorAll(".article-entry img").forEach(function(image) {
      if (image.alt && !image.nextElementSibling?.classList.contains("caption")) {
        image.insertAdjacentHTML("afterend", '<span class="caption">' + image.alt + '</span>');
      }
    });

    document.querySelectorAll(".article-entry table").forEach(function(table) {
      if (table.closest("figure.highlight") || table.parentElement.classList.contains("article-table-wrap")) return;
      var wrap = create("div", "article-table-wrap");
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    document.querySelectorAll(".article-entry h2[id], .article-entry h3[id], .article-entry h4[id]").forEach(function(heading) {
      heading.classList.add("copyable-heading");
      var headerlink = heading.querySelector(".headerlink");
      if (headerlink) {
        headerlink.setAttribute("aria-hidden", "true");
        headerlink.setAttribute("tabindex", "-1");
      }
      if (!heading.querySelector(".heading-copy")) {
        var button = create("button", "heading-copy");
        button.type = "button";
        button.title = "复制链接";
        button.setAttribute("aria-label", "复制此段链接");
        button.textContent = "#";
        heading.appendChild(button);
      }
    });

    document.querySelectorAll(".article-entry figure.highlight, .article-entry > pre").forEach(function(block) {
      if (block.querySelector(".code-copy")) return;
      block.classList.add("code-copy-wrap");
      var button = create("button", "code-copy", "复制");
      button.type = "button";
      block.appendChild(button);
      button.addEventListener("click", function() {
        var code = block.querySelector("td.code, pre");
        copyText((code ? code.textContent : block.textContent).replace(/\n+$/, ""), function() {
          button.classList.add("is-copied");
          button.textContent = "已复制";
          window.setTimeout(function() {
            button.classList.remove("is-copied");
            button.textContent = "复制";
          }, 1400);
        });
      });
    });

    document.addEventListener("click", function(event) {
      var button = event.target.closest(".heading-copy");
      if (!button) return;
      var heading = button.closest("h2[id], h3[id], h4[id]");
      if (!heading) return;
      event.preventDefault();
      var href = "#" + heading.id;
      var url = window.location.origin + window.location.pathname + href;
      window.history.replaceState(null, "", href);
      copyText(url, function(){});
      button.classList.add("is-copied");
      window.setTimeout(function() {
        button.classList.remove("is-copied");
      }, 1400);
    });
  };

  var initToc = function() {
    var toc = document.querySelector(".article-toc");
    if (!toc) return;

    var button = create("button", "toc-toggle", "文章目录");
    button.type = "button";
    toc.insertBefore(button, toc.firstChild);
    if (window.innerWidth <= 1100) toc.classList.add("is-collapsed");

    button.addEventListener("click", function() {
      toc.classList.toggle("is-collapsed");
    });

    var links = Array.from(toc.querySelectorAll('a[href^="#"]'));
    var headings = links.map(function(link) {
      return document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
    }).filter(Boolean);

    var setActive = function() {
      var activeId = "";
      headings.forEach(function(heading) {
        if (heading.getBoundingClientRect().top < 140) activeId = heading.id;
      });
      links.forEach(function(link) {
        link.classList.toggle("is-active", activeId && decodeURIComponent(link.getAttribute("href").slice(1)) === activeId);
      });
    };

    window.addEventListener("scroll", setActive, { passive: true });
    window.addEventListener("resize", setActive);
    setActive();
  };

  var initBackToTop = function() {
    var button = create("button", "back-to-top");
    button.type = "button";
    button.setAttribute("aria-label", "回到顶部");
    button.innerHTML = '<span class="back-to-top-arrow" aria-hidden="true"></span><span class="back-to-top-label" aria-hidden="true">TOP</span>';
    body.appendChild(button);

    var sync = function() {
      button.classList.toggle("is-visible", window.pageYOffset > 480);
    };

    button.addEventListener("click", function() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  };

  var initLibraryFilter = function() {
    var library = document.querySelector(".article-library");
    if (!library) return;
    var items = Array.from(library.querySelectorAll(".latest-item"));
    if (!items.length) return;
    var tags = [];

    items.forEach(function(item) {
      var itemTags = Array.from(item.querySelectorAll(".latest-tags a")).map(function(link) {
        return link.textContent.trim();
      });
      item.dataset.tags = itemTags.join("|");
      itemTags.forEach(function(tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });

    var filters = create("div", "library-filters");
    filters.setAttribute("aria-label", "按标签筛选文章");
    filters.innerHTML = '<button type="button" class="is-active" data-tag="all">全部</button>' +
      tags.map(function(tag) { return '<button type="button" data-tag="' + tag + '">' + tag + '</button>'; }).join("");
    library.querySelector(".library-stats").after(filters);
    library.querySelector(".library-list").insertAdjacentHTML("afterend", '<p class="library-empty">这个标签下暂时没有文章。</p>');

    var apply = function(tag) {
      var visible = 0;
      filters.querySelectorAll("button").forEach(function(button) {
        button.classList.toggle("is-active", button.dataset.tag === tag);
      });
      items.forEach(function(item) {
        var match = tag === "all" || (item.dataset.tags || "").split("|").indexOf(tag) !== -1;
        item.classList.toggle("is-hidden", !match);
        if (match) visible += 1;
      });
      library.querySelector(".library-empty").classList.toggle("is-visible", visible === 0);
    };

    filters.addEventListener("click", function(event) {
      var button = event.target.closest("button");
      if (button) apply(button.dataset.tag);
    });
    library.addEventListener("click", function(event) {
      var link = event.target.closest(".latest-tags a");
      if (!link) return;
      event.preventDefault();
      apply(link.textContent.trim());
      document.getElementById("latest-posts-title").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  var initReveal = function() {
    var targets = Array.from(document.querySelectorAll(".reveal-panel, .featured-card, .latest-item"));
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function(target) { target.classList.add("is-revealed"); });
      return;
    }

    body.classList.add("reveal-enabled");
    var timer = window.setTimeout(function() {
      body.classList.add("reveal-fallback");
    }, 900);
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
      if (targets.every(function(target) { return target.classList.contains("is-revealed"); })) {
        window.clearTimeout(timer);
      }
    }, { threshold: 0.12 });
    targets.forEach(function(target, index) {
      target.style.transitionDelay = Math.min(index * 35, 220) + "ms";
      observer.observe(target);
    });
  };

  var initMobileMenu = function() {
    var container = document.getElementById("container");
    var button = document.getElementById("main-nav-toggle");
    if (!container || !button) return;
    button.addEventListener("click", function(event) {
      event.stopPropagation();
      var open = !container.classList.contains("site-menu-on");
      container.classList.toggle("site-menu-on", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", open ? "收起导航" : "展开导航");
    });
  };

  initTheme();
  initSearch();
  initArticleEnhancements();
  initToc();
  initBackToTop();
  initLibraryFilter();
  initReveal();
  initMobileMenu();
  body.classList.add("is-ready");
})();
