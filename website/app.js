const I18N = {
  en: {
    "meta.title": "VA Auto-Pilot | Built for Frontier Models",
    "meta.description":
      "VA Auto-Pilot is an autonomous engineering loop built for frontier models. Set goals, constraints, and acceptance criteria. Let the strongest model find the path.",
    "meta.ogDescription":
      "Built for frontier models. Scales with model capability. Set goals and constraints — let the strongest model find the path.",
    "meta.twitterDescription":
      "Autonomous engineering loop built for frontier models. Constraint-derived perspectives. CLI-enforced correctness gates. Scales with model capability.",

    "nav.philosophy": "Philosophy",
    "nav.loop": "Loop",
    "nav.commands": "Commands",
    "nav.compare": "Compare",

    "cta.repo": "Repository",
    "cta.install": "Install VA Auto-Pilot Skill",
    "cta.viewLoop": "Explore the Loop",

    "hero.eyebrow": "Built for Frontier Models",
    "hero.title": "Scales with model capability. Set goals and constraints — let the strongest model find the path.",
    "hero.lead":
      "VA Auto-Pilot does not compensate for model weakness. It sets the bar high, then trusts the frontier model to reach it. As models improve, the framework improves with them.",
    "hero.signal1": "Frontier-model-first by design",
    "hero.signal2": "Perspectives derived from constraints, not role lists",
    "hero.signal3": "CLI-enforced correctness gates",

    "philosophy.eyebrow": "Core Architecture",
    "philosophy.title": "Six ideas that make this framework different",
    "philosophy.card1.title": "Perspectives emerge from constraints — never from role lists",
    "philosophy.card1.body":
      "First identify real constraints and anchors. Then ask: which expert views expose the most critical failure modes for this specific change? Perspectives are derived, not assigned. This is why reviews sharpen over time.",
    "philosophy.card2.title": "The manager delegates — it never implements",
    "philosophy.card2.body":
      "The manager's value is knowing what must be true, not how to make it true. Implementation is always delegated with objective, constraints, and completion gate. The sub-agent decides the path.",
    "philosophy.card3.title": "CLI-first is a correctness guarantee",
    "philosophy.card3.body":
      "Quality gates run via deterministic CLI commands. The model cannot argue past them. npm run check:all either passes or it does not. This separates \"I think it's done\" from \"it is done.\"",
    "philosophy.card4.title": "Frontier-model-first is a scaling property",
    "philosophy.card4.body":
      "This framework does not compensate for model weakness. It designs for strength. As frontier models get more capable, the framework gets better — no rewrites required. Use a weak model and it will fail. That is intentional.",
    "philosophy.card5.title": "Failure knowledge compounds",
    "philosophy.card5.body":
      "Structured failure metadata — hypotheses, missing context, attempted fixes — is captured and injected into future delegations as hard constraints. Each failure makes subsequent delegations more precise. The system gets harder to fool over time.",

    "loop.eyebrow": "Execution Loop",
    "loop.title": "Strategic decomposition, then tactical sprint, then adversarial gate",
    "loop.detailKicker": "Current State",
    "loop.autoplayPause": "Pause Autoplay",
    "loop.autoplayPlay": "Resume Autoplay",

    "demo.eyebrow": "Animated Demo",
    "demo.title": "Watch one autonomous cycle — from goal to commit",
    "demo.terminalTitle": "Execution Stream",
    "demo.run": "Run Again",
    "demo.promptKicker": "Goal-First Directive Example",

    "commands.eyebrow": "Distribution & Commands",
    "commands.title": "Install once, delegate continuously",
    "commands.skillDirLabel": "Skill directory (for Codex skill-installer)",
    "commands.skillRawLabel": "Direct skill URL (for any agent)",
    "commands.codexInstall": "Codex install",
    "commands.codexUse": "Codex invocation",
    "commands.claudeInstall": "Claude install",
    "commands.claudeUse": "Claude invocation",

    "compare.eyebrow": "Honest Positioning",
    "compare.title": "Who this is for — and who it is not for",
    "compare.va.title": "VA Auto-Pilot is for you if",
    "compare.va.body":
      "You run frontier-grade models and want a framework that scales with their capability. You need guaranteed quality gates, adversarial sprint reviews, and a loop that gets smarter from failure. You're willing to accept framework protocol in exchange for compounding guarantees.",
    "compare.notfor.title": "VA Auto-Pilot is not for you if",
    "compare.notfor.body":
      "You're using a weak or mid-tier model — the framework won't compensate. You want to control every implementation step. You want minimal ceremony and fast iteration without gates. Or you're running a small, bounded task that a single prompt handles fine.",
    "compare.link": "Read full comparison",

    "credits.eyebrow": "Credits",
    "credits.title": "Built by Vadaski & Codex",
    "credits.body":
      "Authors: Vadaski, Codex. Acknowledgements: Claude and the Vera project, where many practical patterns were distilled and validated.",

    "footer.tagline": "Built for frontier models. Scales with model capability. Gets smarter from failure.",

    "common.copy": "Copy",
    "common.copyLink": "Copy Link",
    "common.copyCmd": "Copy Command",
    "common.copied": "Copied",
    "common.copyFail": "Copy failed"
  },
  zh: {
    "meta.title": "VA Auto-Pilot | 为最前沿模型而生",
    "meta.description":
      "VA Auto-Pilot 是为最前沿模型而建的自治工程闭环。给出目标、约束与验收标准，让最强的模型找到路径。",
    "meta.ogDescription":
      "为最前沿模型而生。随模型能力扩展。给出目标与约束——让最强模型找到路径。",
    "meta.twitterDescription": "为前沿模型而建的自治工程闭环。约束推导视角，CLI 强制正确性门禁，随模型能力扩展。",

    "nav.philosophy": "设计哲学",
    "nav.loop": "闭环",
    "nav.commands": "命令",
    "nav.compare": "定位",

    "cta.repo": "仓库",
    "cta.install": "安装 VA Auto-Pilot Skill",
    "cta.viewLoop": "查看执行闭环",

    "hero.eyebrow": "为最前沿模型而生",
    "hero.title": "随模型能力扩展。给出目标与约束——让最强模型找到路径。",
    "hero.lead": "VA Auto-Pilot 不为模型能力不足做补偿。它设定高标准，然后信任前沿模型达到它。模型越强，框架越好。",
    "hero.signal1": "前沿模型优先，由设计决定",
    "hero.signal2": "视角从约束推导，而非角色列表分配",
    "hero.signal3": "CLI 强制正确性门禁",

    "philosophy.eyebrow": "核心架构",
    "philosophy.title": "让这个框架与众不同的六个设计",
    "philosophy.card1.title": "视角从约束中浮现，而不是从角色列表中分配",
    "philosophy.card1.body": "首先识别真实的约束与锚点，再问：哪些专家视角能暴露这次特定变更的最关键失败模式？视角是推导出来的，不是指派的。这就是审查随时间变得更精准的原因。",
    "philosophy.card2.title": "管理者委派——而不是实现",
    "philosophy.card2.body": "管理 Agent 的价值在于知道什么必须为真，而不是怎么实现。实现总是以目标、约束和完成门禁委派给子 Agent。子 Agent 决定路径。",
    "philosophy.card3.title": "CLI 优先是正确性保证",
    "philosophy.card3.body": "质量门禁通过确定性 CLI 命令执行。模型无法用言辞绕过。npm run check:all 只有通过或不通过。这把「我认为做好了」和「确实做好了」分开。",
    "philosophy.card4.title": "前沿模型优先是一种扩展属性",
    "philosophy.card4.body": "这个框架不为模型弱点做补偿，而是为强度做设计。随着前沿模型越来越强，框架越来越好——不需要任何改写。用弱模型它会失败，这是有意为之。",
    "philosophy.card5.title": "失败知识会复利",
    "philosophy.card5.body": "结构化的失败元数据——假设、缺失上下文、尝试过的修复——被捕获并注入未来的委派中作为硬约束。每一次失败让后续委派更加精准。系统随时间越来越难被愚弄。",

    "loop.eyebrow": "执行闭环",
    "loop.title": "战略拆解，然后战术冲刺，然后对抗性门禁",
    "loop.detailKicker": "当前状态",
    "loop.autoplayPause": "暂停自动播放",
    "loop.autoplayPlay": "继续自动播放",

    "demo.eyebrow": "动画演示",
    "demo.title": "观看一轮自治执行——从目标到提交",
    "demo.terminalTitle": "执行流",
    "demo.run": "重新演示",
    "demo.promptKicker": "目标优先指令示例",

    "commands.eyebrow": "分发与命令",
    "commands.title": "一次安装，持续委派",
    "commands.skillDirLabel": "Skill 目录链接（Codex skill-installer）",
    "commands.skillRawLabel": "Skill 直链（任意 Agent）",
    "commands.codexInstall": "Codex 安装",
    "commands.codexUse": "Codex 调用",
    "commands.claudeInstall": "Claude 安装",
    "commands.claudeUse": "Claude 调用",

    "compare.eyebrow": "诚实的定位",
    "compare.title": "适合谁——以及不适合谁",
    "compare.va.title": "VA Auto-Pilot 适合你，如果",
    "compare.va.body": "你在用前沿级别的模型，想要一个随能力扩展的框架。你需要有保证的质量门禁、对抗性冲刺审查，以及一个从失败中变聪明的闭环。你愿意接受框架协议，换取复利式的质量保证。",
    "compare.notfor.title": "VA Auto-Pilot 不适合你，如果",
    "compare.notfor.body": "你用的是弱或中等模型——框架不会替你补能力。你想控制每一个实现步骤。你想要轻量流程和没有门禁的快速迭代。或者你只是在处理一个单条提示词就能搞定的小任务。",
    "compare.link": "阅读完整对比",

    "credits.eyebrow": "作者与致谢",
    "credits.title": "由 Vadaski 与 Codex 共创",
    "credits.body": "作者：Vadaski、Codex。致谢：Claude 与 Vera 项目，许多可复用工程模式在其中被沉淀并验证。",

    "footer.tagline": "为最前沿模型而生。随模型能力扩展。从失败中变得更强。",

    "common.copy": "复制",
    "common.copyLink": "复制链接",
    "common.copyCmd": "复制命令",
    "common.copied": "已复制",
    "common.copyFail": "复制失败"
  }
};

const STATE_DETAILS = {
  en: [
    {
      title: "Backlog",
      body: "For high-level goals, a Strategic Decomposition phase runs first: parallel sub-agents each audit one independent dimension of the problem — security, performance, correctness, UX — without cross-contamination. Their findings converge into a prioritized backlog of bounded tasks. Only then does the tactical sprint begin.",
      checks: ["Goal classified: strategic or tactical", "Dimensions scanned independently", "Backlog populated with concrete, bounded tasks"]
    },
    {
      title: "In Progress",
      body: "Implementation runs under objective + constraints only. No implementation steps are prescribed — the sub-agent decides the path. This is deliberate: strong models reason well from objectives, poorly from step-by-step instructions that second-guess their judgment. Independent tracks run in parallel.",
      checks: ["Objective and constraints delegated — no how", "Independent tracks parallelized", "CLI-first execution; no self-certification"]
    },
    {
      title: "Review",
      body: "Before review begins, the manager identifies real constraints and anchors for this specific change. Perspectives emerge from that analysis — not from a fixed role list. Each perspective probes failure modes the others miss. A generic role list gives generic assurance. Constraint-derived perspectives give specific assurance.",
      checks: ["Constraints and anchors identified first", "Perspectives derived — not assigned", "Each perspective probes distinct failure modes"]
    },
    {
      title: "Testing",
      body: "Acceptance flows validate behavior against deterministic CLI gates. MUST assertions must be 100% — these are correctness requirements. SHOULD assertions enforce a quality floor at >= 80%. Parallel tracks synchronize here before any state promotion. The model cannot argue past a failing gate.",
      checks: ["MUST = 100%", "SHOULD >= 80%", "Parallel tracks synchronize at gates before promotion"]
    },
    {
      title: "Done",
      body: "Before a sprint reaches Done, a fresh-context adversarial reviewer runs — one who has seen only the diff, not what was intended. Their job: find what the sprint team was blind to. This is the Sprint Completion Gate. It exists to prevent self-validation bias from accumulating across sprints until a significant regression slips through.",
      checks: ["Adversarial reviewer: fresh context, diff only", "CRITICAL findings block completion", "Commit created only after gate clears"]
    }
  ],
  zh: [
    {
      title: "Backlog",
      body: "对于高层目标，首先运行战略拆解阶段：并行子 Agent 各自独立审计问题的一个维度——安全、性能、正确性、体验——各维度之间不交叉污染。所有发现汇聚成有优先级的有界任务待办。只有在此之后，战术冲刺才开始。",
      checks: ["目标分类：战略级还是战术级", "各维度独立扫描", "待办填充为具体有界的任务"]
    },
    {
      title: "In Progress",
      body: "只基于目标与约束执行——不规定实现步骤，子 Agent 自己决定路径。这是有意为之的：强模型从目标出发推理很好，从替它做判断的步骤清单出发推理效果差。独立轨道并发推进。",
      checks: ["只委派目标和约束——不给怎么做", "独立轨道并发执行", "CLI 优先；不允许自我认证"]
    },
    {
      title: "Review",
      body: "评审开始前，管理 Agent 先识别这次具体变更的真实约束与锚点。视角从这个分析中浮现——而不是从固定角色列表中分配。每个视角探测其他视角遗漏的失败模式。通用角色列表给出通用保证；约束推导视角给出针对性保证。",
      checks: ["首先识别约束与锚点", "视角推导而来——不是指派", "每个视角探测不同失败模式"]
    },
    {
      title: "Testing",
      body: "验收流通过确定性 CLI 门禁验证行为。MUST 断言必须 100% 通过——这是正确性要求。SHOULD 断言在 >= 80% 处强制质量下限。并发轨道在此同步，然后才能推进状态。模型无法用言辞绕过失败的门禁。",
      checks: ["MUST = 100%", "SHOULD >= 80%", "并发轨道在门禁处同步后才推进状态"]
    },
    {
      title: "Done",
      body: "冲刺到达 Done 之前，一个全新上下文的对抗性审查员运行——他只看到 diff，看不到意图是什么。他的工作：找到冲刺团队视而不见的东西。这是冲刺收尾门禁，防止自我验证偏差在冲刺间累积，直到一个重大回归悄悄通过。",
      checks: ["对抗性审查员：全新上下文，只看 diff", "CRITICAL 发现阻断完成", "门禁通过后才创建提交"]
    }
  ]
};

const DEMO_LINES = {
  en: [
    "$ va-auto-pilot",
    "[manager] Read human-board + run-journal",
    "[manager] Goal is strategic — running dimension scan",
    "[scan] 3 parallel sub-agents: correctness / security / UX",
    "[scan] dimensions converged -> 7 bounded tasks added to backlog",
    "[manager] next -> AP-014: improve checkout reliability under 300ms p95",
    "[delegation] objective + constraints delegated — no implementation steps",
    "[manager] spawn 3 parallel CLI tracks (api / ui / tests)",
    "[gate] npm run check:all ... PASS",
    "[gate] parallel outputs synchronized",
    "[gate] codex review --uncommitted ... PASS",
    "[gate] npm run validate:distribution ... PASS",
    "[gate] Sprint Completion Gate: adversarial reviewer (diff only) ... PASS",
    "[state] AP-014 -> Done",
    "[journal] appended: failure hypothesis + pitfall entry",
    "[loop] continue with next highest priority task"
  ],
  zh: [
    "$ va-auto-pilot",
    "[manager] 读取 human-board + run-journal",
    "[manager] 目标为战略级——运行维度扫描",
    "[扫描] 3 个并行子 Agent：正确性 / 安全 / 体验",
    "[扫描] 各维度汇聚 -> 7 个有界任务加入待办",
    "[manager] next -> AP-014：在 p95<300ms 下提升结算稳定性",
    "[委派] 目标+约束已委派——不规定实现步骤",
    "[manager] 启动 3 条并发轨道（api / ui / tests）",
    "[门禁] npm run check:all ... PASS",
    "[门禁] 并发输出已同步",
    "[门禁] codex review --uncommitted ... PASS",
    "[门禁] npm run validate:distribution ... PASS",
    "[门禁] 冲刺收尾门禁：对抗性审查（仅 diff）... PASS",
    "[状态] AP-014 -> Done",
    "[日志] 已追加：失败假设 + 陷阱条目",
    "[循环] 进入下一优先级任务"
  ]
};

const GOAL_PROMPTS = {
  en: `$va-auto-pilot

Objective:
Launch onboarding v2 that improves activation by >= 12%.

Constraints:
- Keep architecture boundaries unchanged
- No security regressions
- Keep p95 response under 300ms

Acceptance:
- typecheck/lint/test pass
- review has no blocking findings
- acceptance flow MUST 100%, SHOULD >= 80%`,
  zh: `$va-auto-pilot

目标：
上线 onboarding v2，激活率提升 >= 12%。

约束：
- 不改变架构边界
- 不引入安全回归
- p95 响应保持在 300ms 内

验收：
- typecheck/lint/test 全通过
- review 无阻断问题
- 验收流 MUST 100%，SHOULD >= 80%`
};

let currentLang = localStorage.getItem("va_auto_pilot_lang") === "zh" ? "zh" : "en";
let activeState = 0;
let stateAutoplayTimer = null;
let stateAutoplay = true;

function readMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? "";
}

function inferGitHubContext() {
  const host = window.location.hostname;
  if (!host.endsWith("github.io")) {
    return { owner: "", repo: "" };
  }

  const owner = host.split(".")[0] ?? "";
  const firstPath = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  const repo = firstPath || `${owner}.github.io`;
  return { owner, repo };
}

function toRawUrl(owner, repo, branch, filePath) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

function toTreeUrl(owner, repo, branch, filePath) {
  return `https://github.com/${owner}/${repo}/tree/${branch}/${filePath}`;
}

function toBlobUrl(owner, repo, branch, filePath) {
  return `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
}

function setLink(id, href) {
  const node = document.getElementById(id);
  if (!node) return;
  node.href = href;
  node.textContent = href;
}

function applyI18n(lang) {
  const dict = I18N[lang];
  if (!dict) return;

  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    if (!key || dict[key] === undefined) continue;
    node.textContent = dict[key];
  }

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = dict["meta.title"];

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", dict["meta.description"]);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", dict["meta.ogDescription"]);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", dict["meta.title"]);

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute("content", dict["meta.twitterDescription"]);

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute("content", dict["meta.title"]);

}

function setupLanguageToggle() {
  const en = document.getElementById("langEn");
  const zh = document.getElementById("langZh");
  if (!en || !zh) return;

  function applyButtons(lang) {
    en.classList.toggle("active", lang === "en");
    zh.classList.toggle("active", lang === "zh");
  }

  en.addEventListener("click", () => {
    currentLang = "en";
    localStorage.setItem("va_auto_pilot_lang", "en");
    applyI18n(currentLang);
    renderDynamicContent();
    renderStateDetail(activeState);
    runDemoAnimation();
    applyButtons(currentLang);
  });

  zh.addEventListener("click", () => {
    currentLang = "zh";
    localStorage.setItem("va_auto_pilot_lang", "zh");
    applyI18n(currentLang);
    renderDynamicContent();
    renderStateDetail(activeState);
    runDemoAnimation();
    applyButtons(currentLang);
  });

  applyButtons(currentLang);
}

async function copyText(value) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function bindCopyButtons() {
  for (const button of document.querySelectorAll(".copy-btn")) {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      if (!targetId) return;
      const text = document.getElementById(targetId)?.textContent?.trim() ?? "";
      const ok = await copyText(text);
      const dict = I18N[currentLang];
      const original = button.textContent;
      button.textContent = ok ? dict["common.copied"] : dict["common.copyFail"];
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    });
  }

  const copySkillLink = document.getElementById("copySkillLink");
  const copySkillRawLink = document.getElementById("copySkillRawLink");

  if (copySkillLink) {
    copySkillLink.addEventListener("click", async () => {
      const ok = await copyText(document.getElementById("skillDirLink")?.textContent ?? "");
      const dict = I18N[currentLang];
      const original = copySkillLink.textContent;
      copySkillLink.textContent = ok ? dict["common.copied"] : dict["common.copyFail"];
      window.setTimeout(() => {
        copySkillLink.textContent = original;
      }, 1200);
    });
  }

  if (copySkillRawLink) {
    copySkillRawLink.addEventListener("click", async () => {
      const ok = await copyText(document.getElementById("skillRawLink")?.textContent ?? "");
      const dict = I18N[currentLang];
      const original = copySkillRawLink.textContent;
      copySkillRawLink.textContent = ok ? dict["common.copied"] : dict["common.copyFail"];
      window.setTimeout(() => {
        copySkillRawLink.textContent = original;
      }, 1200);
    });
  }
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      if (!target) return;

      for (const item of tabs) {
        item.classList.toggle("active", item === tab);
      }

      for (const panel of panels) {
        panel.classList.toggle("active", panel.getAttribute("data-panel") === target);
      }
    });
  }
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.14 }
  );

  for (const node of nodes) {
    observer.observe(node);
  }
}

function renderStateDetail(index) {
  const bundle = STATE_DETAILS[currentLang][index];
  const title = document.getElementById("stateDetailTitle");
  const body = document.getElementById("stateDetailBody");
  const checks = document.getElementById("stateDetailChecks");
  if (!bundle || !title || !body || !checks) return;

  title.textContent = bundle.title;
  body.textContent = bundle.body;
  checks.innerHTML = "";
  for (const item of bundle.checks) {
    const li = document.createElement("li");
    li.textContent = item;
    checks.append(li);
  }

  for (const node of document.querySelectorAll(".state-node")) {
    const nodeIndex = Number(node.getAttribute("data-state"));
    node.classList.toggle("active", nodeIndex === index);
  }
}

function stepState() {
  activeState = (activeState + 1) % STATE_DETAILS[currentLang].length;
  renderStateDetail(activeState);
}

function startAutoplay() {
  if (stateAutoplayTimer) window.clearInterval(stateAutoplayTimer);
  stateAutoplayTimer = window.setInterval(stepState, 2200);
}

function setupStateMachine() {
  for (const node of document.querySelectorAll(".state-node")) {
    node.addEventListener("click", () => {
      activeState = Number(node.getAttribute("data-state") ?? 0);
      renderStateDetail(activeState);
    });
  }

  const toggle = document.getElementById("machineToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      stateAutoplay = !stateAutoplay;
      const dict = I18N[currentLang];

      if (stateAutoplay) {
        startAutoplay();
        toggle.textContent = dict["loop.autoplayPause"];
      } else {
        if (stateAutoplayTimer) window.clearInterval(stateAutoplayTimer);
        toggle.textContent = dict["loop.autoplayPlay"];
      }
    });
  }

  renderStateDetail(activeState);
  startAutoplay();
}

function renderDynamicContent() {
  const ownerMeta = readMeta("github-owner");
  const repoMeta = readMeta("github-repo") || "va-auto-pilot";
  const branch = readMeta("github-branch") || "main";
  const inferred = inferGitHubContext();

  const owner = ownerMeta || inferred.owner || "Vadaski";
  const repo = repoMeta || inferred.repo || "va-auto-pilot";

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const skillDirUrl = toTreeUrl(owner, repo, branch, "skills/va-auto-pilot");
  const skillRawUrl = toRawUrl(owner, repo, branch, "skills/va-auto-pilot/SKILL.md");
  const claudeCommandRawUrl = toRawUrl(owner, repo, branch, "skills/va-auto-pilot/claude-command.md");
  const compareDocPath =
    currentLang === "zh"
      ? "docs/comparisons/va-auto-pilot-vs-ralph.zh.md"
      : "docs/comparisons/va-auto-pilot-vs-ralph.en.md";
  const compareDocUrl = toBlobUrl(owner, repo, branch, compareDocPath);

  setLink("skillDirLink", skillDirUrl);
  setLink("skillRawLink", skillRawUrl);

  const repoLink = document.getElementById("repoLink");
  if (repoLink) repoLink.href = repoUrl;

  const footerRepoLink = document.getElementById("footerRepoLink");
  if (footerRepoLink) footerRepoLink.href = repoUrl;
  const compareDocLink = document.getElementById("compareDocLink");
  if (compareDocLink) compareDocLink.href = compareDocUrl;

  setText("codexInstallCmd", `$skill-installer install ${skillDirUrl}`);
  setText(
    "codexUseCmd",
    currentLang === "zh"
      ? "$va-auto-pilot 在当前仓库按最高标准执行一轮闭环，不要我给实现步骤"
      : "$va-auto-pilot run one full loop in this repo with highest standards; do not ask me for implementation steps"
  );

  setText(
    "claudeInstallCmd",
    `mkdir -p .claude/commands\ncurl -fsSL ${claudeCommandRawUrl} -o .claude/commands/va-auto-pilot.md`
  );
  setText("claudeUseCmd", "/va-auto-pilot");

  setText("goalPromptExample", GOAL_PROMPTS[currentLang]);
}

function runDemoAnimation() {
  const log = document.getElementById("demoLog");
  if (!log) return;

  const lines = DEMO_LINES[currentLang];
  log.textContent = "";

  let index = 0;
  function writeNext() {
    if (index >= lines.length) return;
    log.textContent += `${lines[index]}\n`;
    log.scrollTop = log.scrollHeight;
    index += 1;
    window.setTimeout(writeNext, 260);
  }

  writeNext();
}

function setupDemoButton() {
  const button = document.getElementById("runDemo");
  if (!button) return;
  button.addEventListener("click", runDemoAnimation);
}

function boot() {
  applyI18n(currentLang);
  setupLanguageToggle();
  setupTabs();
  setupReveal();
  setupStateMachine();
  setupDemoButton();
  renderDynamicContent();
  bindCopyButtons();
  runDemoAnimation();
}

boot();
