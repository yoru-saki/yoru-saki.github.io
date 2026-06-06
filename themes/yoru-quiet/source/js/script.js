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
      button.setAttribute("aria-label", isDark ? "切换到浅色主题" : "切换到深色主题");
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
      symbol.dataset.themeIcon = isDark ? "sun" : "moon";
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
      window.dispatchEvent(new CustomEvent("yoru:theme-change", { detail: { theme: next } }));
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
      if (block.classList.contains("mermaid") || block.querySelector("pre.mermaid")) return;
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

  var initMermaid = function() {
    var blocks = Array.from(document.querySelectorAll(".article-entry pre.mermaid"));
    if (!blocks.length) return;

    var cleanLabel = function(value) {
      return (value || "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/<br\s*\/?>/gi, " / ")
        .replace(/\s+/g, " ")
        .replace(/^["']|["']$/g, "")
        .trim();
    };

    var escapeHtml = function(value) {
      return cleanLabel(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };

    var decodeDiagramSource = function(value) {
      var text = (value || "").replace(/\u00a0/g, " ");
      for (var i = 0; i < 2; i += 1) {
        text = text
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;|&apos;/g, "'");
      }
      return text;
    };

    var collectFlow = function(source) {
      var nodes = {};
      var order = [];
      var edges = [];
      var addNode = function(id, label) {
        if (!id) return;
        if (!nodes[id]) {
          nodes[id] = cleanLabel(label || id);
          order.push(id);
          return;
        }
        if (label && nodes[id] === id) nodes[id] = cleanLabel(label);
      };

      source.split(/\n/).forEach(function(raw) {
        var line = raw.trim();
        if (!line || /^(flowchart|graph|subgraph|end\b)/i.test(line)) return;
        line.replace(/([A-Za-z][\w]*)\["([^"]+)"\]/g, function(_, id, label) {
          addNode(id, label);
          return _;
        });
        var edge = line.match(/^([A-Za-z][\w]*)(?:\[[^\]]+\])?\s*[-=.]+>\s*(?:\|"([^"]+)"\|\s*)?([A-Za-z][\w]*)/);
        if (!edge) edge = line.match(/^([A-Za-z][\w]*)(?:\[[^\]]+\])?\s*[-=.]+(?:\|"([^"]+)"\|\s*)?>\s*([A-Za-z][\w]*)/);
        if (edge) {
          addNode(edge[1]);
          addNode(edge[3]);
          edges.push({ from: edge[1], to: edge[3], label: edge[2] || "" });
        }
      });

      return { nodes: nodes, order: order, edges: edges };
    };

    var buildFlowLevels = function(flow) {
      var indegree = {};
      var outgoing = {};
      flow.order.forEach(function(id) {
        indegree[id] = 0;
        outgoing[id] = [];
      });
      flow.edges.forEach(function(edge) {
        if (indegree[edge.to] === undefined) indegree[edge.to] = 0;
        if (!outgoing[edge.from]) outgoing[edge.from] = [];
        outgoing[edge.from].push(edge.to);
        indegree[edge.to] += 1;
      });

      var levels = {};
      var queue = flow.order.filter(function(id) { return indegree[id] === 0; });
      if (!queue.length) queue = flow.order.slice(0, 1);
      queue.forEach(function(id) { levels[id] = 0; });

      var guard = 0;
      while (queue.length && guard < flow.order.length * flow.order.length) {
        var current = queue.shift();
        guard += 1;
        (outgoing[current] || []).forEach(function(next) {
          var nextLevel = (levels[current] || 0) + 1;
          if (levels[next] === undefined || nextLevel > levels[next]) levels[next] = nextLevel;
          indegree[next] -= 1;
          if (indegree[next] <= 0) queue.push(next);
        });
      }

      flow.order.forEach(function(id) {
        if (levels[id] === undefined) levels[id] = 0;
      });

      var maxLevel = Math.max.apply(null, flow.order.map(function(id) { return levels[id]; }).concat([0]));
      var columns = [];
      for (var i = 0; i <= maxLevel; i += 1) columns.push([]);
      flow.order.forEach(function(id) {
        columns[levels[id]].push(id);
      });
      return columns;
    };

    var renderLevelMap = function(flow) {
      var columns = buildFlowLevels(flow);
      if (!columns.length) return "";
      var stageNames = ["入口", "接口", "调度", "能力", "工具", "数据", "输出"];
      return '<div class="diagram-level-map" aria-label="分层结构">' + columns.map(function(column, index) {
        var title = stageNames[index] || ("层级 " + (index + 1));
        return '<section><small>' + escapeHtml(title) + '</small>' + column.map(function(id) {
          return '<span>' + escapeHtml(flow.nodes[id] || id) + '</span>';
        }).join("") + '</section>';
      }).join("") + '</div>';
    };

    var collectSequence = function(source) {
      var participants = {};
      var order = [];
      var messages = [];
      var addParticipant = function(id, label) {
        if (!id || participants[id]) return;
        participants[id] = cleanLabel(label || id);
        order.push(id);
      };

      source.split(/\n/).forEach(function(raw) {
        var line = raw.trim();
        if (!line || /^sequenceDiagram/i.test(line)) return;
        var participant = line.match(/^participant\s+([A-Za-z][\w]*)\s+as\s+(.+)$/i);
        if (participant) {
          addParticipant(participant[1], participant[2]);
          return;
        }
        var message = line.match(/^([A-Za-z][\w]*)\s*-{1,2}>{1,2}\s*([A-Za-z][\w]*)\s*:\s*(.+)$/);
        if (message) {
          addParticipant(message[1]);
          addParticipant(message[2]);
          messages.push({ from: message[1], to: message[2], label: message[3] });
        }
      });

      return { participants: participants, order: order, messages: messages };
    };

    var renderFallback = function(diagram) {
      var source = diagram.dataset.source || "";
      var isSequence = /^sequenceDiagram/m.test(source.trim());
      if (isSequence) {
        var sequence = collectSequence(source);
        diagram.classList.add("is-structured");
        diagram.classList.remove("is-fallback");
        diagram.classList.remove("is-error");
        diagram.innerHTML =
          '<div class="diagram-fallback-head"><span>时序图</span><strong>调用链路</strong></div>' +
          '<ol class="diagram-edge-list diagram-flow-list">' + sequence.messages.map(function(edge) {
            return '<li><span>' + escapeHtml(sequence.participants[edge.from] || edge.from) + '</span><b aria-hidden="true">→</b><span>' + escapeHtml(sequence.participants[edge.to] || edge.to) + '</span><em>' + escapeHtml(edge.label) + '</em></li>';
          }).join("") + '</ol>' +
          '<div class="diagram-node-grid" aria-label="参与方">' + sequence.order.map(function(id) {
            return '<span>' + escapeHtml(sequence.participants[id] || id) + '</span>';
          }).join("") + '</div>';
        return;
      }

      var flow = collectFlow(source);
      diagram.classList.add("is-structured");
      diagram.classList.remove("is-fallback");
      diagram.classList.remove("is-error");
      diagram.innerHTML =
        '<div class="diagram-fallback-head"><span>结构图</span><strong>系统结构</strong></div>' +
        renderLevelMap(flow) +
        '<ol class="diagram-edge-list diagram-flow-list">' + flow.edges.map(function(edge) {
          return '<li><span>' + escapeHtml(flow.nodes[edge.from] || edge.from) + '</span><b aria-hidden="true">→</b><span>' + escapeHtml(flow.nodes[edge.to] || edge.to) + '</span>' + (edge.label ? '<em>' + escapeHtml(edge.label) + '</em>' : "") + '</li>';
        }).join("") + '</ol>' +
        '<div class="diagram-node-grid" aria-label="节点清单">' + flow.order.map(function(id) {
          return '<span>' + escapeHtml(flow.nodes[id] || id) + '</span>';
        }).join("") + '</div>';
    };

    blocks.forEach(function(block, index) {
      var host = create("div", "mermaid yoru-mermaid");
      host.id = "mermaid-diagram-" + index;
      host.dataset.source = decodeDiagramSource(block.textContent);
      host.textContent = host.dataset.source;
      block.replaceWith(host);
      renderFallback(host);
    });

    var render = function() {
      if (!window.mermaid) return;
      var isDark = html.getAttribute("data-theme") === "dark";
      var diagrams = Array.from(document.querySelectorAll(".yoru-mermaid"));
      diagrams.forEach(function(diagram) {
        diagram.removeAttribute("data-processed");
        diagram.classList.remove("is-structured");
        diagram.innerHTML = "";
        diagram.textContent = diagram.dataset.source || "";
      });
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        htmlLabels: true,
        themeVariables: {
          background: isDark ? "#17272d" : "#fffaf2",
          primaryColor: isDark ? "#1c363d" : "#f8f0df",
          primaryTextColor: isDark ? "#f2f8f7" : "#0f2732",
          primaryBorderColor: isDark ? "#79d2d9" : "#096f83",
          lineColor: isDark ? "#e4c173" : "#9f413d",
          secondaryColor: isDark ? "#223f46" : "#edf7f4",
          tertiaryColor: isDark ? "#2b3330" : "#fbf1dc",
          fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim()
        }
      });
      diagrams.reduce(function(chain, diagram) {
        return chain.then(function() {
          return window.mermaid.run({ nodes: [diagram] }).catch(function() {
            renderFallback(diagram);
          });
        });
      }, Promise.resolve()).catch(function() {
        diagrams.forEach(function(diagram) {
          if (!diagram.querySelector("svg")) renderFallback(diagram);
        });
      });
    };

    var wait = function(attempts) {
      if (window.mermaid) {
        render();
        return;
      }
      if (attempts <= 0) {
        document.querySelectorAll(".yoru-mermaid").forEach(function(diagram) {
          renderFallback(diagram);
        });
        return;
      }
      window.setTimeout(function() { wait(attempts - 1); }, 120);
    };

    wait(30);
    window.addEventListener("yoru:theme-change", function() {
      window.setTimeout(function() {
        if (window.mermaid) {
          render();
          return;
        }
        document.querySelectorAll(".yoru-mermaid").forEach(function(diagram) {
          renderFallback(diagram);
        });
      }, 80);
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
    button.innerHTML = '<span class="back-to-top-arrow" aria-hidden="true"></span><span class="back-to-top-label" aria-hidden="true">回顶部</span>';
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

  var initDiagramPreview = function() {
    var figures = Array.from(document.querySelectorAll(".article-entry .mermaid-static"));
    if (!figures.length) return;

    var overlay = create("div", "diagram-preview");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "查看结构图大图");
    overlay.innerHTML =
      '<button class="diagram-preview-close" type="button" aria-label="关闭结构图预览"><span aria-hidden="true">×</span></button>' +
      '<div class="diagram-preview-panel"><img alt=""></div>';
    body.appendChild(overlay);

    var previewImage = overlay.querySelector("img");
    var previewPanel = overlay.querySelector(".diagram-preview-panel");
    var closeButton = overlay.querySelector(".diagram-preview-close");
    var previousFocus = null;
    var activeFigure = null;
    var transformState = {
      scale: 1,
      x: 0,
      y: 0,
      startScale: 1,
      startX: 0,
      startY: 0,
      startDistance: 0,
      startMidX: 0,
      startMidY: 0,
      mode: "",
      dragging: false
    };

    var clamp = function(value, min, max) {
      return Math.min(max, Math.max(min, value));
    };

    var distance = function(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    var midpoint = function(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    };

    var applyTransform = function() {
      var rect = previewPanel.getBoundingClientRect();
      var maxX = rect.width * (transformState.scale - 1) * 0.52;
      var maxY = rect.height * (transformState.scale - 1) * 0.52;
      transformState.x = clamp(transformState.x, -maxX, maxX);
      transformState.y = clamp(transformState.y, -maxY, maxY);
      previewImage.style.transform = "translate3d(" + transformState.x + "px, " + transformState.y + "px, 0) scale(" + transformState.scale + ")";
      previewPanel.classList.toggle("is-panned", transformState.scale > 1.02);
      previewPanel.classList.toggle("is-dragging", transformState.dragging);
    };

    var resetTransform = function() {
      transformState.scale = 1;
      transformState.x = 0;
      transformState.y = 0;
      transformState.mode = "";
      transformState.dragging = false;
      applyTransform();
    };

    var diagramSrcForTheme = function(figure) {
      var isDark = html.getAttribute("data-theme") === "dark";
      return (isDark ? figure.dataset.diagramDark : figure.dataset.diagramLight) || figure.dataset.diagramSrc || "";
    };

    var syncPreviewTheme = function() {
      if (!activeFigure || !overlay.classList.contains("is-open")) return;
      var nextSrc = diagramSrcForTheme(activeFigure);
      if (nextSrc && previewImage.getAttribute("src") !== nextSrc) previewImage.src = nextSrc;
    };

    var open = function(figure, image) {
      previousFocus = document.activeElement;
      activeFigure = figure;
      previewImage.src = diagramSrcForTheme(figure) || image.currentSrc || image.src;
      previewImage.alt = image.alt || "结构图";
      overlay.classList.add("is-open");
      body.classList.add("diagram-preview-open");
      resetTransform();
      closeButton.focus();
    };

    var close = function() {
      overlay.classList.remove("is-open");
      body.classList.remove("diagram-preview-open");
      previewImage.removeAttribute("src");
      activeFigure = null;
      resetTransform();
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };

    figures.forEach(function(figure) {
      var image = figure.querySelector("img");
      if (!image) return;
      figure.classList.add("is-zoomable");
      figure.setAttribute("role", "button");
      figure.setAttribute("tabindex", "0");
      figure.setAttribute("aria-label", "点击放大结构图");
      figure.addEventListener("click", function() {
        open(figure, image);
      });
      figure.addEventListener("keydown", function(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(figure, image);
      });
    });

    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) close();
    });
    previewPanel.addEventListener("click", function(event) {
      event.stopPropagation();
    });
    previewPanel.addEventListener("wheel", function(event) {
      if (!overlay.classList.contains("is-open")) return;
      event.preventDefault();
      var rect = previewPanel.getBoundingClientRect();
      var previousScale = transformState.scale;
      var scaleStep = event.deltaY < 0 ? 1.14 : 0.88;
      var nextScale = clamp(previousScale * scaleStep, 1, 5);
      var focalX = event.clientX - rect.left - rect.width / 2;
      var focalY = event.clientY - rect.top - rect.height / 2;
      if (nextScale <= 1.02) {
        resetTransform();
        return;
      }
      transformState.scale = nextScale;
      transformState.x = focalX - (focalX - transformState.x) * (nextScale / previousScale);
      transformState.y = focalY - (focalY - transformState.y) * (nextScale / previousScale);
      applyTransform();
    }, { passive: false });
    previewPanel.addEventListener("mousedown", function(event) {
      if (event.button !== 0 || !overlay.classList.contains("is-open")) return;
      event.preventDefault();
      transformState.mode = "mouse";
      transformState.dragging = true;
      transformState.startX = event.clientX - transformState.x;
      transformState.startY = event.clientY - transformState.y;
      applyTransform();
    });
    previewPanel.addEventListener("touchstart", function(event) {
      if (event.touches.length === 1) {
        transformState.mode = "pan";
        transformState.startX = event.touches[0].clientX - transformState.x;
        transformState.startY = event.touches[0].clientY - transformState.y;
        return;
      }
      if (event.touches.length === 2) {
        event.preventDefault();
        var mid = midpoint(event.touches);
        transformState.mode = "pinch";
        transformState.startDistance = distance(event.touches);
        transformState.startScale = transformState.scale;
        transformState.startX = transformState.x;
        transformState.startY = transformState.y;
        transformState.startMidX = mid.x;
        transformState.startMidY = mid.y;
      }
    }, { passive: false });
    previewPanel.addEventListener("touchmove", function(event) {
      if (!overlay.classList.contains("is-open")) return;
      if (event.touches.length === 1 && transformState.mode === "pan") {
        event.preventDefault();
        transformState.x = event.touches[0].clientX - transformState.startX;
        transformState.y = event.touches[0].clientY - transformState.startY;
        applyTransform();
        return;
      }
      if (event.touches.length === 2) {
        event.preventDefault();
        var mid = midpoint(event.touches);
        var nextScale = transformState.startScale * (distance(event.touches) / Math.max(1, transformState.startDistance));
        transformState.scale = clamp(nextScale, 1, 4);
        transformState.x = transformState.startX + (mid.x - transformState.startMidX);
        transformState.y = transformState.startY + (mid.y - transformState.startMidY);
        applyTransform();
      }
    }, { passive: false });
    previewPanel.addEventListener("touchend", function(event) {
      if (event.touches.length === 0) transformState.mode = "";
      if (transformState.scale < 1.03) resetTransform();
    });
    previewPanel.addEventListener("dblclick", function(event) {
      event.preventDefault();
      transformState.scale = transformState.scale > 1.05 ? 1 : 2;
      transformState.x = 0;
      transformState.y = 0;
      applyTransform();
    });
    document.addEventListener("mousemove", function(event) {
      if (transformState.mode !== "mouse" || !transformState.dragging) return;
      event.preventDefault();
      transformState.x = event.clientX - transformState.startX;
      transformState.y = event.clientY - transformState.startY;
      applyTransform();
    });
    document.addEventListener("mouseup", function() {
      if (transformState.mode !== "mouse") return;
      transformState.mode = "";
      transformState.dragging = false;
      if (transformState.scale < 1.03) resetTransform();
      else applyTransform();
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
    window.addEventListener("yoru:theme-change", syncPreviewTheme);
    window.addEventListener("resize", function() {
      if (overlay.classList.contains("is-open")) applyTransform();
    });
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
  initMermaid();
  initDiagramPreview();
  initToc();
  initBackToTop();
  initLibraryFilter();
  initReveal();
  initMobileMenu();
  body.classList.add("is-ready");
})();
