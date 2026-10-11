# Motivation science for a study-tracking app (GitHub-style commit log + contribution heatmap)

Scope: what the peer-reviewed evidence says about starting and sustaining study behaviour in teenagers and university students, organised by mechanism, with effect sizes, populations, and failure modes. Target product: an app that records study sessions like commits and renders a contribution heatmap, so the self-monitoring, streak, and progress-visualisation sections are the most developed.

Evidence-grading convention used below:
- **[MA]** meta-analysis or systematic review; **[RCT/field]** randomised or field experiment; **[Lab]** lab/online experiment; **[Obs]** correlational/survey; **[Practitioner]** company blog, book, press; **[Secondary]** figure seen only in a secondary summary, not verified against the primary paper.
- Note on method: web search in this session hit a shared budget limit after ~50 queries, and every direct page fetch failed at DNS, so several figures below come from search-result abstracts and secondary summaries rather than full texts. Each such case is marked.

---

## 1. Self-monitoring / self-tracking: logging and visualising study time

### Takeaway
Making people monitor goal progress reliably increases goal attainment (d ≈ 0.40 across 138 RCTs), and the effect is larger when progress is physically recorded and reported to others, which is exactly what a commit log does. The two documented failure modes are (a) quantification turning an enjoyable activity into "work" and lowering intrinsic motivation/enjoyment even while raising output (Etkin 2016), and (b) dashboards that only raise awareness without supporting action, or that frame progress as competition with peers; reviews of learning-analytics dashboards find no reliable achievement gains from awareness-only designs.

### Cited Findings
- **[MA]** Harkin et al. (2016, *Psychological Bulletin* 142, 198–229), 138 randomised studies, N = 19,951: interventions that prompted progress monitoring increased monitoring frequency (d+ = 1.98, 95% CI [1.71, 2.24]) and goal attainment (d+ = 0.40, 95% CI [0.32, 0.48]); change in monitoring frequency mediated the attainment effect. Effects were larger when progress was *physically recorded* and when it was *reported publicly*. — [White Rose eprint](https://eprints.whiterose.ac.uk/id/eprint/91437/); [Frontiers summary](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00434/pdf)
- **[MA, caveat]** The "public reporting" moderator in Harkin et al. rested on only three studies with a wide confidence interval, and most included studies were health-behaviour (diet, exercise) rather than academic. — [Secondary write-up](https://siliconcanals.com/t-progress-monitoring-recorded-public-goal-achievement/)
- **[Lab]** Etkin (2016, *Journal of Consumer Research* 42(6), 967–984), "The Hidden Cost of Personal Quantification", six experiments: measuring an activity increased how much people did it but reduced enjoyment and subsequent intrinsic motivation; e.g., 105 students given numerical feedback while colouring shapes coloured more but reported enjoying it less. Mechanism: quantified output makes a pleasant activity feel like work. — [Wharton PDF of working paper](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Etkin-Jordan-11-12-15-Hidden-Cost.pdf); [Abstract](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/11-12-2015-Etkin-Jordan-Title-and-Abstract.pdf)
- **[Review, contested]** A 2021 article ("Hidden in Plain Sight") argues for psychological *benefits* of quantification, so the net sign is debated. — [IJPBA 2021](https://www.graphyonline.com/archives/IJPBA/2021/IJPBA-174/)
- **[Systematic review]** Jivet, Scheffel, Drachsler & Specht (EC-TEL 2017), "Awareness is not enough": review narrowing 1,439 papers to 26 learner-facing dashboards; most common goal was "awareness and reflection", with the pitfall that awareness is treated as if it equals action. Secondary summary: current designs "foster competition between learners rather than knowledge mastery" and offer "misguided reference points for comparison" (e.g., class average). — [OU research portal](https://research.ou.nl/en/publications/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards/); [Slide deck](https://www.slideshare.net/slideshow/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards-in-the-educational-practice/80007584); [SciSpace summary of findings](https://stagecf.scispace.com/authors/marcus-specht-5da4xdi086)
- **[Practitioner summary of own research]** Jivet (SoLAR): "checking a dashboard without changing learning behaviour won't improve outcomes", dashboards need features that support decisions and action. — [SoLAR](https://www.solaresearch.org/?p=8136)
- **[Systematic review]** Matcha, Uzir, Gašević & Pardo (2020, *IEEE Transactions on Learning Technologies*): empirical dashboard studies reviewed through Winne & Hadwin's SRL model have weak theoretical grounding and offer little support for metacognition or effective learning tactics; evaluation reporting is poor; proposes the MULAS design model (theory, design, feedback, evaluation). — [Adelaide repository](https://digital.library.adelaide.edu.au/items/6cb25a66-ac4c-43b5-b12c-d57be8cd9c81)
- **[Systematic review]** Kaliisa et al. (LAK 2024, "Have learning analytics dashboards lived up to the hype?"), 38 studies: no evidence that dashboards improved academic achievement; most effects negligible or small; motivation/attitude effects modest; participation showed the largest effects; too few compatible studies for a pooled meta-analysis. — [arXiv 2312.15042](https://arxiv.org/abs/2312.15042); [SoLAR webinar slides](https://solaresearch.org/wp-content/uploads/2025/02/SoLAR_webinar_feb25.pdf)
- **[MA]** Kokoç et al. (2025, *J. Research on Technology in Education*): 23 studies, N = 9,710, learning-analytics *interventions* (broader than dashboards) improved academic performance with average effect 0.359 (95% CI 0.230–0.487). — [Bozok University record](https://avesis.bozok.edu.tr/yayin/c3c6ea07-7ea9-41e6-b3bb-ab52096083d4/a-meta-analysis-on-the-effect-of-learning-analytics-interventions-on-students-academic-performance)
- **[Secondary]** Liu et al. (2025) reportedly found that simply providing information to learners had no significant effect, whereas visualisation combined with other supports was useful. — [ACU summary](https://inspire.acu.edu.au/articles/learning-analytics)
- **[Systematic review, adjacent]** Biedermann, Schneider & Drachsler (2022, *J. Computer Assisted Learning*), 28 digital self-control interventions for media multitasking: interventions relying purely on *increasing awareness* were "barely effective"; overall confidence low (small samples, short durations). — [Frankfurt repository](https://publikationen.ub.uni-frankfurt.de/opus4/frontdoor/index/index/year/2022/docId/63952)
- **[Obs]** Jivet et al. ("Quantum of choice") built a customisable Coursera dashboard where learners set goals and choose indicators; analysed 401 learners' indicator choices in relation to goals and SRL skills. — [TU Delft](https://research.tudelft.nl/en/publications/quantum-of-choice-how-learners-feedback-monitoring-decisions-goal)
- **[Systematic review]** A 2026 *Journal of Learning Analytics* review (69 articles, 2019–2024) maps adaptive dashboard features to metacognitive, motivational and behavioural SRL components and reiterates Jivet et al. (2017): conventional dashboards mainly raise awareness, and awareness alone does not sustain self-regulation. — [JLA](https://learning-analytics.info/index.php/JLA/article/view/9303)

### Inferences
- A commit log is a "physically recorded" monitor, and an optional share/follow feature would add "public reporting"; both are the moderators Harkin et al. found to enlarge the attainment effect. Expect the monitoring effect to be real but moderate (d ≈ 0.4), and expect it to work through *frequency* of logging, so friction in the logging flow directly erodes the benefit.
- Etkin's result is the clearest mechanism behind "記録が目的化": a prominent minutes/commits counter can convert study from something students partly like into a chore. Mitigations consistent with the evidence: keep raw totals low-salience by default, foreground qualitative/informational feedback (what was studied, what is next) over quantity, let users hide numbers, and avoid turning time-logged into the headline metric.
- Dashboard reviews converge on one design rule: every visual must be paired with an actionable next step (plan the next session, pick what to review), and comparison reference points should be self-set goals or the user's own history, not peers or class averages.
- Nothing in the dashboard literature shows a heatmap by itself raises achievement; the heatmap should be treated as an engagement/participation device (where Kaliisa et al. saw the largest effects), not as a learning intervention.

### Gaps
- No study was found that tests a *GitHub-style heatmap* specifically, or that measures anxiety from study-time logging in students; the anxiety claims are inferred from Etkin (enjoyment) and from the dashboard reviews' comments on competition.
- Zimmerman's SRL model was not retrieved directly (search budget exhausted); the SRL framing above comes via Matcha et al. (Winne & Hadwin) and the JLA reviews.
- Full texts of Harkin et al. and Kaliisa et al. could not be fetched, so moderator-level effect sizes (recorded vs not; public vs private) are not reported here.

---

## 2. Streaks and loss aversion

### Takeaway
Streaks measurably increase engagement, but the effect depends on how the log *represents* behaviour, not on the behaviour itself; broken streaks cause disengagement that is worse when users blame themselves and smaller when the streak can be repaired or is defined flexibly (Silverman & Barasch 2023, 7 studies). Duolingo's own A/B tests (practitioner, but large-N) show that decoupling the streak from a daily goal and adding commitment framing raised retention, and the firm now surrounds the streak with forgiveness mechanics.

### Cited Findings
- **[Lab/field, 7 studies]** Silverman & Barasch (2023, *Journal of Consumer Research*), "On or Off Track: How (Broken) Streaks Affect Consumer Decisions": intact streaks highlighted in behavioural logs increase subsequent engagement relative to broken streaks; the effect is *independent of actual past behaviour* and depends solely on how the log represents it. The broken-streak penalty is larger when people attribute the break to themselves rather than external factors, and smaller when they can repair the streak. — [UDel repository](https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb); [CU Boulder summary](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions)
- **[Authors' design advice]** Silverman: avoid "you broke your streak" notifications and instead offer alternative ways to keep the streak alive; what counts as a streak can be made flexible (in one experiment the streak survived if participants played either of two game types). Barasch: recovery-style messaging after a break is typically ineffective; people tend to disengage once a streak ends. — [Lerner profile](https://lerner.udel.edu/seeing-opportunity/lerner-professor-researches-how-streaks-motivate-us/); [CU Boulder news](https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch)
- **[Practitioner, large-N A/B]** Duolingo engineering blog, "Improving the streak": separating the daily goal from the streak raised Day-14 retention by 3.3% (relative), daily active learners by 1%, and the share of daily learners on a streak by 10.5% within 20 days. — [Duolingo blog](https://blog.duolingo.com/improving-the-streak)
- **[Practitioner, secondary]** Duolingo Group PM Jackson Shuttleworth describes 600+ streak-mechanic experiments; changing the CTA from "continue" to "commit to my goal" produced significant positive outcomes. — [Interview highlights](https://videohighlight.com/v/_CCwoQZH5hI)
- **[Practitioner, secondary]** Summaries of Duolingo 2022 experiments: a streak-goal selection screen whose chosen value was never stored still improved retention for weeks (commitment effect alone); other retention levers were widgets that change mood when lessons are skipped, special streak app icons, goal-commitment copy, and "Perfect Streak Week". — [Lazyweb summary](https://www.lazyweb.com/research/duolingo-retention-experiments); [Lazyweb on streak goals](https://experiments.lazyweb.com/research/duolingo-streak-goals-retention)
- **[Practitioner, secondary]** Roughly 9 million Duolingo users hold a streak of at least one year (figure repeated in press and the PM interview; original Duolingo source not located). — [The Audiencers](https://theaudiencers.com/subscription-models-live-off-habits-lessons-from-duolingos-retention-success/)
- **[Lab/field]** Loss-aversion-adjacent progress effects: Nunes & Drèze (2006) endowed progress (34% vs 19% redemption) and Kivetz et al. (2006) illusionary progress increasing retention in a rewards programme (see section 5) are the mechanisms streaks exploit: an accumulated asset that would be "lost". — [Nunes & Drèze PDF](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)

### Inferences
- For a contribution heatmap, the Silverman & Barasch result means the *rendering* is the lever: a single grey cell breaking a long green run will visibly broadcast a broken streak and trigger the self-blame disengagement path. Options that follow from the evidence: (1) define the streak flexibly (e.g., "weekly streak": any N of 7 days, or counting any logged activity including planning/review as a commit), (2) offer repair (retroactive logging within a grace window, a limited "freeze"), (3) never send a "you broke it" notification, (4) attribute misses externally where plausible ("exam week", "holiday") rather than to the user.
- Duolingo's data suggest the streak should be separable from the size of the daily goal; a tiny commit should preserve the streak, with effort goals tracked separately.
- The commitment-screen result (value not even stored, retention still improved) implies a cheap win: ask students to choose and state a streak/commit target at onboarding.

### Gaps
- The Duolingo blog page could not be fetched, so details of *streak freeze* / *streak repair* mechanics and their measured effects are not documented here; the figures above are limited to what the search abstract exposed.
- No peer-reviewed study of *streak-related anxiety* or guilt in habit/study apps was found; a targeted search for qualitative HCI work on streak pressure returned only anxiety-app burden studies, which do not mention streaks. — [Balaskas et al. 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474730/)
- The original "what-the-hell effect" literature (Polivy & Herman, dieting) was not retrieved; the broken-streak disengagement evidence above is the closest documented analogue.
- Lally et al. (2010) reportedly found that missing a single day did not materially harm habit formation; this is widely quoted but was not verified in the sources retrieved here (see section 9).

---

## 3. Gamification: points, badges, leaderboards, and intrinsic vs extrinsic motivation

### Takeaway
Across meta-analyses, gamification has small-to-medium positive effects on learning outcomes (g ≈ 0.46–0.50) and smaller, less stable effects on motivation and behaviour (g ≈ 0.25–0.36); the cognitive effect survives in rigorous subsets, the motivational one does not. Element-level experiments show that points/levels/leaderboards alone do not raise intrinsic motivation, and longitudinal classroom exposure to competitive elements lowered motivation (Hanus & Fox). Contingent rewards reliably undermine free-choice intrinsic motivation (d ≈ −0.28 to −0.40), whereas positive informational feedback enhances it.

### Cited Findings
- **[MA]** Sailer & Homner (2020, *Educational Psychology Review* 32(1), 77–112): cognitive outcomes g = 0.49 [0.30, 0.69], k = 19, N = 1,686; motivational g = 0.36 [0.18, 0.54], k = 16, N = 2,246; behavioural g = 0.25 [0.04, 0.46], k = 9, N = 951. Cognitive effect stable in a high-rigor subsplit; motivational and behavioural effects less stable. Moderators for behaviour: game fiction and social interaction; combining competition with collaboration was particularly effective. — [Augsburg full text](https://opus.bibliothek.uni-augsburg.de/opus4/files/109056/109056.pdf); [Record](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)
- **[MA]** Huang, Ritzhaupt et al. (2020, *ETR&D*): overall g = 0.464 [0.244, 0.684] on learning outcomes; examined 14 design elements. — [ECNU record](https://pure.ecnu.edu.cn/en/publications/the-impact-of-gamification-in-educational-settings-on-student-lea/)
- **[MA]** Bai, Hew & Huang (2020): 30 interventions from 24 quantitative studies, g = 0.504 in favour of gamification; effects varied with sample size and intervention duration. (The 2019 ICCE conference version reported g = 0.36.) — [UZH summary](https://www.gbl.uzh.ch/quartz/references/Bai-et-al.-(2020)); [ICCE 2019 PDF](https://v0.apsce.net/icce/icce2019/proceedings/paper_136.pdf)
- **[MA, caution]** A 2026 higher-education meta-analysis reports d = 1.12 [0.42, 1.83] but with I² = 98.84%, i.e., effects are wildly heterogeneous and outcome measures inconsistent. — [SAGE Open](https://journals.sagepub.com/doi/10.1177/21582440261421375)
- **[RCT/field, longitudinal]** Hanus & Fox (2015), 80 communication students over a semester, control group, elements = leaderboards, points, badges, competition, coins: motivation (Intrinsic Motivation Inventory) *decreased* with gamification, attributed to competitive features and long exposure; measures included satisfaction, empowerment and exam scores. (Exam-score direction not confirmed in retrieved sources.) — [Springer table summary](https://educationaltechnologyjournal.springeropen.com/articles/10.1186/s41239-017-0042-5/tables/13); [Emerald review citing it](https://www.emerald.com/intr/article/33/7/1/178330)
- **[Lab]** Mekler, Brühlmann, Tuch & Opwis (2017, *Computers in Human Behavior* 71, 525–534), 2×4 online experiment (points, leaderboards, levels × causality orientation): elements did not significantly change competence or intrinsic motivation vs control, regardless of orientation; performance (tag quantity) did not track intrinsic motivation. Authors propose elements framed as *informational* could support competence. — [Unibas record](https://edoc.unibas.ch/32047/); [Annotated PDF](https://glassmanlab.seas.harvard.edu/annotated_works/mekler17.pdf)
- **[Field, small]** Leaderboard in a mathematical-physics course (45 students, Philippines): higher-ranked students gained; lower-ranked students lost motivation and their quiz scores varied more. — [JOTSE](https://jotse.org/index.php/jotse/article/view/3321)
- **[Lab]** Crowdsourcing leaderboard experiment: high ranks led participants to take easy routes to protect standing; low ranks led to continued careful work; neither pattern reflected intrinsic motivation. — [Emerald/Internet Research](https://www.emerald.com/intr/article/33/7/1/178330)
- **[Field]** Engineering education (n = 89): leaderboard condition produced significant learning gains, no interaction once background variables controlled. — [ESPOL PDF](https://www.cti.espol.edu.ec/sites/default/files/docs_pdf/Gamification%20through%20leaderboards_An%20empirical%20study%20in%20engineering%20education.pdf)
- **[MA]** Deci, Koestner & Ryan (1999, *Psychological Bulletin*), 128 experiments: engagement-, completion- and performance-contingent tangible rewards reduced free-choice intrinsic motivation (d = −0.40, −0.36, −0.28); engagement/completion-contingent rewards also reduced self-reported interest (d = −0.15, −0.17); *positive feedback* enhanced free-choice behaviour. — [Washington PDF](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2731358/)
- **[MA, dispute]** Cameron, Banko & Pierce (2001) rebut: "Pervasive negative effects of rewards on intrinsic motivation: the myth continues"; the debate over the size of the undermining effect remains open. — [Scholarhub record](https://scholarhub.vn/publication/:slug/9460423c-1ed9-4760-995d-5dd57e6628aa)
- **[Review]** Ryan & Deci (2020, *Contemporary Educational Psychology* 61, 101860): autonomous forms of motivation predict positive educational outcomes and rise when students' needs for autonomy, competence and relatedness are supported; extrinsic motivation varies in autonomy from external control to integrated self-regulation. — [doi:10.1016/j.cedpsych.2020.101860](https://doi.org/10.1016/j.cedpsych.2020.101860); [ACU record](https://acuresearchbank.acu.edu.au/item/8w53q/intrinsic-and-extrinsic-motivation-from-a-self-determination-theory-perspective-definitions-theory-practices-and-future-directions)

### Inferences
- The robust part of the gamification literature is "small positive effect on learning, especially with narrative/social elements", not "points and badges motivate". For a study app this argues for social/collaborative framing and goal structure over PBL (points-badges-leaderboards) mechanics.
- Hanus & Fox is the key cautionary case for a product students will use for months: competitive elements that look fine in a two-week study eroded motivation over a semester. Any leaderboard should be opt-in, cohort-sized, and ideally team-vs-team (Sailer & Homner's competition-plus-collaboration moderator) rather than individual rankings that show low performers their position.
- Deci et al. suggests that rewards contingent on *logging a session* (engagement-contingent) are the most corrosive type; informational feedback ("you covered 3 of 5 topics", "longest focus block this week") is the SDT-compatible alternative.

### Gaps
- Element-level meta-analytic estimates (which specific elements help learning) were not retrievable beyond Huang et al.'s mention of 14 elements.
- No teen-specific gamification meta-analysis was found; most samples are university students.

---

## 4. Social mechanisms: accountability, commitment devices, body doubling, social comparison

### Takeaway
Publicly reporting progress amplifies the monitoring effect (Harkin et al.), and students demonstrably *demand* commitment devices, but self-imposed deadlines help less than externally structured ones and in one field study did not raise completion at all. Financial commitment contracts show large effects in a randomised smoking trial, but the main evidence comes from stickK's founders. Body doubling/study-with-me has essentially no controlled evidence; classic social facilitation effects are small (d ≈ 0.3 on simple tasks). Social comparison via leaderboards helps top performers and discourages those at the bottom.

### Cited Findings
- **[MA]** Harkin et al. (2016): goal attainment effects larger when monitoring was reported publicly (but only 3 studies in that category). — [White Rose eprint](https://eprints.whiterose.ac.uk/id/eprint/91437/)
- **[Lab/field]** Ariely & Wertenbroch (2002, *Psychological Science* 13(3), 219–224): students accept costly self-imposed deadlines; those who set their own deadlines performed worse than students given evenly spaced external deadlines (errors detected, lateness, earnings) but better than those with one final deadline. Secondary description: 60 students proofreading three passages, 10 cents per error found, $1/day late penalty. — [Duke record](https://scholars.duke.edu/publication/810365); [MIT PDF](https://erationality.media.mit.edu/papers/dan/eRational/Dynamic%20preferences/deadlines.pdf); [APS summary](https://www.psychologicalscience.org/news/self-imposed-deadlines-dont-stop-procrastination-heres-what-might.html)
- **[Field]** Bisin & Hyndman (2014, NBER w19874): students display strong demand for commitment via self-imposed deadlines, but the deadlines did not increase task completion rates. — [NBER PDF](https://www.nber.org/papers/w19874.pdf)
- **[RCT/field]** Giné, Karlan & Zinman (2010, *AEJ: Applied*), commitment contracts for smoking cessation (Philippines, Green Bank of Caraga): secondary summary reports 30% of those accepting a penalty contract met the goal vs 5% in control. Conflict of interest: Karlan is president of stickK.com; Zinman on its advisory board. — [FTC conference PDF](https://www.ftc.gov/sites/default/files/documents/public_events/first-annual-microeconomics-conference/dkarlan.pdf); [J-PAL](https://povertyactionlab.org/media/3662)
- **[Practitioner, self-reported]** stickK marketing claims commitment contracts "more than triple" success odds and an 80% reported success rate for anti-charity stakes; not independently audited. — [TechCrunch](https://techcrunch.com/2008/02/15/stickk-allows-you-to-put-a-contract-on-yourself/amp/)
- **[Obs]** Lee et al. (2021, KAIST) analysed real-world stickK usage data, noting prior evidence was mostly small-scale single-behaviour experiments. — [KAIST PDF](https://ic.kaist.ac.kr/files/papers/lee2021sticky.pdf)
- **[MA]** Bond & Titus (1983, *Psychological Bulletin* 94(2), 265–292; doi:10.1037/0033-2909.94.2.265), 241 studies of social facilitation: small facilitation effect on simple tasks (d = 0.32, as reported in a 2020 preregistered replication). — [PubMed](https://pubmed.ncbi.nlm.nih.gov/6356198/); [Psych Science 2020 PDF](https://publikationen.ub.uni-frankfurt.de/files/55447/0956797620902101.pdf)
- **[MA]** van Meurs, Greve & Strauß (motor tasks): overall g = 0.24 [−0.01, 0.50], p = .061, high heterogeneity. — [Münster record](https://cris-portal.uni-muenster.de/portal/en/publication/79531093)
- **[Preprint]** VR body-doubling for ADHD (2025): evidence is mixed, ranging from helpful to distracting; individual traits may explain variance. — [arXiv 2509.12153](https://arxiv.org/pdf/2509.12153); 2026 roadmap treats "study with me" videos as digital body doubling. — [arXiv 2605.07851](https://arxiv.org/pdf/2605.07851)
- **[Press]** NPR-syndicated piece: hundreds of study-with-me videos with tens of millions of views; expert attributes benefit to an imagined audience as accountability. — [WAMC](https://www.wamc.org/2024-07-25/come-study-with-me-how-a-virtual-buddy-might-help-you-get-things-done)
- **[Practitioner]** Focusmate pairs users with a stranger for 25/50/75-minute sessions; no controlled study found. Downside noted in press: people sensitive to being on camera or to others' movement find it draining. — [Any.do blog](https://www.any.do/blog/body-doubling-why-working-alongside-others-helps-you-focus-and-get-more-done/); [Grazia](https://graziamagazine.com/us/?p=112982)
- **[Field/Lab]** Leaderboard social comparison: see section 3 (low-ranked students lose motivation; high-ranked protect position by taking easy routes). — [JOTSE](https://jotse.org/index.php/jotse/article/view/3321); [Internet Research](https://www.emerald.com/intr/article/33/7/1/178330)
- **[Systematic review]** Jivet et al. (2017): dashboards' typical reference points (peer comparison) are "misguided" and promote competition over mastery. — [OU portal](https://research.ou.nl/en/publications/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards/)

### Inferences
- The evidence supports lightweight accountability (share your heatmap with a friend, mentor or small group) more than financial stakes; the one large-effect commitment-contract study is in smoking and carries a founder conflict of interest.
- Deadline features should default to *externally structured, evenly spaced* milestones (e.g., weekly check-ins tied to a syllabus) rather than relying on users to self-impose them; a "commit and check in" structure is defensible, a "pick your own deadline" feature alone is not.
- Body doubling/study-with-me can be offered as an optional mode, but should be presented as a preference feature rather than an evidence-based one; the underlying social facilitation effect is small and task-dependent.
- Upward social comparison with visible rank is the one social feature with documented harm for the students most at risk; if comparison is used, limit it to self-chosen friends or to team aggregates.

### Gaps
- The CHI paper on "study with me" videos (Lee et al.) was not retrievable; no controlled study of Focusmate or of study-with-me on productivity was found.
- Peer-encouragement interventions (messages from friends) and their effect on study time were not located within the search budget.
- The Matthews/Dominican "written goals + weekly friend update" study is widely cited in practitioner writing but was not searched or verified here.

---

## 5. Goal setting and planning: implementation intentions, MCII/WOOP, goal gradient, small wins, temptation bundling, fresh starts

### Takeaway
If-then plans are the best-evidenced single technique (d = 0.65 across 94 tests; 642 tests in the 2024 update), and a 30-minute MCII exercise raised high-schoolers' practice-question completion by >60%; the MCII meta-analytic effect is smaller (g ≈ 0.34) and shrinks when delivered by document rather than by a person. Progress framing (endowed progress, goal gradient) raises completion and retention; fresh-start timing (Mondays, new months/semesters, birthdays) reliably predicts aspirational behaviour; temptation bundling boosted gym attendance 51% but decayed after a break.

### Cited Findings
- **[MA]** Gollwitzer & Sheeran (2006, *Adv. Exp. Soc. Psychol.* 38, 69–119; doi:10.1016/S0065-2601(06)38002-1): 94 independent tests, >8,000 participants, implementation intentions on goal attainment d = 0.65 (95% CI ≈ 0.6–0.7); benefits across getting started, shielding from distraction, disengaging from failing paths, and conserving capacity. — [Konstanz record](https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f); [Frontiers citing CI](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.565202/pdf)
- **[MA]** Sheeran, Listrom & Gollwitzer (2024): 642 independent tests with a taxonomy of cues and responses. — [Summary](https://goalsandprogress.com/implementation-intentions-research/)
- **[RCT]** Duckworth, Grant, Loew, Oettingen & Gollwitzer (2011, *Educational Psychology* 31(1), 17–26): 66 second-year high-school students preparing for a high-stakes exam; 30-minute written MCII vs placebo writing; MCII group completed >60% more practice questions. Test scores not reported. — [Konstanz PDF](https://www.socmot.uni-konstanz.de/sites/default/files/duckworth_self-regulation_11.pdf); [Learning Scientists blog](https://www.learningscientists.org/blog/2017/7/4-1)
- **[MA]** Wang, Wang & Gai (2021), MCII on goal attainment: 21 studies, N = 15,907, g = 0.336; stronger with experimenter interaction (g = 0.465) than document-only delivery (g = 0.277); authors note publication bias, true effects may be smaller. — [PMC8149892](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8149892/)
- **[RCT, null]** MCII for college students' book reading (n = 90): MCII group did not read more than controls overall; within-group, quantity and quality of the written MCII (specificity, intact if-then) predicted reading. — [SBP Journal](https://sbp-journal.com/index.php/sbp/article/view/5218)
- **[Review]** MCII can be completed in ~8 minutes (Kizilcec & Cohen 2017, cited in review). — [Frontiers](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.565202/text)
- **[Field]** Nunes & Drèze (2006, *JCR* 32): car-wash loyalty card requiring 8 purchases; pre-stamped 10-slot card (2 "free" stamps) 34% redemption vs 19% for empty 8-slot card. — [USC PDF](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)
- **[Field]** Kivetz, Urminsky & Zheng (2006): illusionary goal progress accelerated purchase rate (shorter inter-visit times) and increased programme retention; goal-distance model (effort inversely proportional to psychological distance to reward). — [Encyclopedia summary](https://encyclopedia.pub/entry/38231); [Korea Science review](https://www.koreascience.or.kr/article/JAKO201432764013006.pdf)
- **[Obs, diary]** Amabile & Kramer (*The Progress Principle*): 238 white-collar employees at 7 companies, ~12,000 daily diary entries (~64,000 events), projects up to 9 months: progress in meaningful work was the dominant driver of "inner work life"; tangible incentives barely registered; "catalysts" (clear goals, autonomy) and "nourishers" (interpersonal support) matter. Not a student sample; not an experiment. — [HBS Working Knowledge](https://hbswk.hbs.edu/item/6685.html); [Progress Principle site](https://progressprinciple.com/progress-principle/)
- **[Field, secondary figures]** Milkman, Minson & Volpp temptation bundling: 226 participants, 10 weeks; gym-only audiobook access group visited the gym 51% more than control; effect declined after the Thanksgiving break. — [Fast Company](https://www.fastcompany.com/3049916/w_750); [Todoist summary](https://www.todoist.com/de/inspiration/temptation-bundling)
- **[Archival field]** Dai, Milkman & Riis (2014, *Management Science*; doi:10.1287/mnsc.2014.1901), "The Fresh Start Effect": Google "diet" searches, university gym card-swipe data, and goal-commitment data all rise after temporal landmarks: start of week, month, year, semester, after holidays, after birthdays. — [Wharton PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf); [APS summary](https://www.psychologicalscience.org/news/minds-business/why-monday-is-the-best-day-for-setting-new-goals.html)

### Inferences
- The highest-value planning feature is an if-then prompt at the end of each session ("Tomorrow, when [cue], I will [study X for Y min]"); the research shows the gain comes from specifying cue and response, not from the goal itself.
- A built-in WOOP/MCII onboarding exercise is justified by Duckworth et al., but the meta-analysis warns that document-only delivery halves the effect; a guided, conversational flow (or human/peer facilitation) should outperform a static form.
- Endowed progress is directly applicable to streaks and goals: start new users with pre-filled progress (e.g., first commit credited at onboarding) and frame goals so the user is "already started".
- Fresh-start timing gives a natural notification calendar: Monday mornings, 1st of month, semester start, and birthdays are when students are most receptive to (re)commitment and streak restarts after a break.

### Gaps
- Primary texts of the Milkman temptation-bundling paper (and the 2020 replication) were not retrieved; the 226/51% figures are from secondary coverage.
- No study of temptation bundling or fresh-start prompts in *study* behaviour specifically was found.

---

## 6. Attention and focus: Pomodoro, activation energy, phone presence, app blockers

### Takeaway
Scheduled breaks (Pomodoro-style) improve mood, concentration and perceived efficiency relative to self-chosen breaks in one 87-student experiment, but neither that study nor a 2025 follow-up found differences in task completion, and Pomodoro produced faster fatigue in the follow-up. The "mere presence of a phone reduces cognition" effect (Ward 2017, 520 undergraduates) has failed direct replication and a 33-study meta-analysis finds a null average (d = −0.02), so phone-away features should be framed as reducing *interruptions*, not as cognitive-capacity restoration. App-blocker reviews find thin evidence, with awareness-only tools barely effective.

### Cited Findings
- **[RCT, 1 day]** Biwer et al. (2023), 87 Dutch university students: self-regulated breaks (n = 35) vs 24-min work/6-min break (n = 25) vs 12/3 (n = 27). Self-regulators took longer sessions and breaks, associated with higher fatigue and distractedness and lower concentration and motivation; no difference in mental effort or task completion; scheduled breaks had mood and apparent efficiency benefits. — [Maastricht record](https://cris.maastrichtuniversity.nl/en/publications/understanding-effort-regulation-comparing-pomodoro-breaks-and-sel)
- **[RCT]** 2025 follow-up (MDPI *Behavioral Sciences*): Pomodoro (25/5) vs Flowtime vs self-regulated: Pomodoro breaks led to faster fatigue increase; Pomodoro and Flowtime to faster motivation decrease; but no overall differences in fatigue, motivation, productivity, task completion or flow. — [MDPI](https://www.mdpi.com/2076-328X/15/7/861)
- **[Scoping review, unverified]** A 2025 scoping review quoted on Wikipedia claims Pomodoro interventions "consistently improved focus"; full text not accessed and more positive than the primary studies. — [Wikipedia](https://en.wikipedia.org/wiki/Pomodoro_Technique)
- **[Lab]** Ward, Duke, Gneezy & Bos (2017, *J. Assoc. Consumer Research*): 520 undergraduates randomised to phone on desk / in bag / in another room; working-memory capacity and fluid intelligence tracked phone salience (another room best, desk worst), regardless of power state or face-up/down; mechanism attributed to the cost of suppressing attention. — [UChicago](https://www.journals.uchicago.edu/doi/pdfplus/10.1086/691462); [UT PDF](https://repositories.lib.utexas.edu/bitstream/2152/64130/2/braindrain.pdf)
- **[Replication, null]** A direct replication of Ward et al. (2017) found no difference between smartphone-location conditions. — [Augsburg PDF](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/deliver/index/docId/107880/file/107880.pdf)
- **[MA, null]** Four-level meta-analysis of 33 studies, 4,368 participants: no significant effect of phone presence on cognitive outcomes (d = −0.02, 95% CI [−0.06, 0.01]); an earlier meta-analysis had found a negative effect, so evidence is mixed. (Authors not confirmed, page fetch failed.) — [TMB APA Open](https://tmb.apaopen.org/pub/7np97zr5)
- **[Replication, null]** Replication of Przybylski & Weinstein (2013): no mere-presence effect on relationship quality or creativity. — [PMC8189469](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8189469/); small experiment (n = 47) found no effect on attention, fluid intelligence or divergent thinking. — [CEEOL](https://www.ceeol.com/search/article-detail?id=1199042)
- **[Feature review]** Lyngs et al. (CHI 2019): catalogued 367 digital self-control tools by design feature using a dual-systems model; not an outcome study. — [arXiv 1902.00157](https://arxiv.org/abs/1902.00157v1)
- **[Obs]** Lyngs et al. (2022, *IJHCS*): reviews, ratings and install counts for 334 tools as indirect effectiveness evidence. — [Oxford ORA](https://ora.ox.ac.uk/objects/uuid%3A1b26d9f8-8a14-467a-97db-634e583036b5)
- **[Systematic review]** Biedermann et al. (2022): 28 interventions against distracting media multitasking; awareness-only interventions barely effective; low overall confidence. — [Frankfurt repository](https://publikationen.ub.uni-frankfurt.de/opus4/frontdoor/index/index/year/2022/docId/63952)
- **[Lab]** Ward et al. also reported the phone's presence did not increase phone-related thoughts or interrupt sustained attention, i.e., any cost was in available capacity, not distraction. — [RealKM summary](https://realkm.com/?p=10166)

### Inferences
- A timer with a sensible default (e.g., 25/5 or 24/6) is defensible on mood/concentration grounds, but the app should allow self-regulated sessions since the evidence does not show productivity gains from fixed intervals and shows faster fatigue for strict Pomodoro in one study.
- "Put your phone away" prompts are reasonable as an interruption-reduction habit, but claims about cognitive capacity should not be made in-app given the failed replications.
- Blocking features that merely *inform* (usage stats, nudges) are unlikely to help; friction-based blocking (hard locks during a session) is the design class with any support, and even that is thin.

### Gaps
- No empirical evidence was located for the "2-minute rule" / lowering activation energy (James Clear, BJ Fogg); these are practitioner heuristics. The closest evidence is the implementation-intention literature on *getting started* (section 5).
- No RCT of a consumer app blocker (e.g., Forest) on study time or grades was found.

---

## 7. Spaced repetition, retrieval practice, interleaving: outcomes and motivation

### Takeaway
Practice testing and distributed practice are the two "high-utility" techniques in the leading review (Dunlosky et al. 2013), with interleaving rated moderate and rereading/highlighting low; the practice-testing meta-analysis pools 272 effect sizes. The motivational problem is that students do not spontaneously choose these techniques (only ~11% self-test; ~84% reread), so an app showing "what to review next" must overcome a documented preference for less effective strategies; no evidence was found that such prompts are themselves motivating.

### Cited Findings
- **[Review]** Dunlosky et al. (2013, *Psychological Science in the Public Interest*): practice testing and distributed practice rated high utility; elaborative interrogation, self-explanation and interleaved practice moderate; summarisation, highlighting, keyword mnemonic, imagery and rereading low. (Seen via secondary summaries.) — [Notre Dame summary](https://sites.nd.edu/kaneb/?p=1307); [Oregon State blog](https://blogs.oregonstate.edu/osuteaching/?p=4088)
- **[MA]** Adesope, Trevisan & Sundararajan (2017, *Review of Educational Research*), practice testing: 272 independent effect sizes, ~15,472 participants (article count reported as 118 or 188 in different sources). Pooled effect size not retrieved. — [WSU PDF](https://education.wsu.edu/documents/2018/01/rethinking-use-tests.pdf/)
- **[Review]** 2023 *Educational Psychology Review* article: combining retrieval practice with long spacing gaps ("successive relearning") is particularly effective. — [Springer](https://link.springer.com/article/10.1007/s10648-023-09809-2); [RetrievalPractice.org](https://www.retrievalpractice.org/archive/2018/successive-relearning)
- **[Obs]** Karpicke, Butler & Roediger (2009), 177 undergraduates: ~84% reported rereading, ~55% ranked it first; ~11% practised retrieval, ~1% ranked it first; forced choice ~57% rereading vs ~18% self-testing. — [WUSTL PDF](https://bpb-us-e2.wpmucdn.com/sites.wustl.edu/dist/8/805/files/2026/06/Karpicke-et-al.-2009-Metacognitive-strategies-in-student-learning-Do-students-practise-retrieval-when-they-study-on-thei.pdf)
- **[Reexamination]** Kuhbandner & Emmerdinger (2019) argue the educational conclusions drawn from that survey (about test frequency) may not follow. — [Regensburg](https://pred.uni-regensburg.de/id/eprint/26438)

### Inferences
- Because students systematically under-value retrieval and spacing, a "what to review next" queue is best framed as a default suggestion with low friction, with its benefit communicated as informational feedback (e.g., "retrieval gap: 6 days") rather than as a chore; the practice-testing literature justifies the recommendation even though it does not address motivation.
- The app's commit model fits successive relearning naturally: a commit could carry "topics touched", enabling spacing-based review prompts without a separate flashcard system.

### Gaps
- The primary Dunlosky et al. (2013) article and Adesope et al.'s pooled effect size were not retrieved.
- No studies were found on whether displaying due-for-review items increases session initiation or adherence (e.g., Anki/SuperMemo attrition); this is an open question.

---

## 8. Reward and feedback: variable rewards, immediate feedback, praise vs information, reward removal

### Takeaway
Feedback has a medium average effect on learning (d ≈ 0.48 across 435 studies) but is highly heterogeneous; information-rich, task/process-level feedback is what works, while self-level praise is the least effective and sometimes harmful, and more than a third of feedback interventions in the classic meta-analysis reduced performance. Tangible rewards contingent on engagement lower free-choice intrinsic motivation after removal, whereas positive informational feedback raises it. No peer-reviewed evidence on variable-ratio "slot machine" rewards in education was retrievable.

### Cited Findings
- **[MA]** Wisniewski, Zierer & Hattie (2020, *Frontiers in Psychology*; doi:10.3389/fpsyg.2019.03087): 435 studies, k = 994, N > 61,000; overall d = 0.48 (random effects) with significant heterogeneity; impact substantially moderated by *information content* of feedback. — [PMC6987456](https://pmc.ncbi.nlm.nih.gov/articles/PMC6987456); [Frontiers PDF](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/pdf)
- **[MA]** Kluger & DeNisi (1996, *Psychological Bulletin*): 607 effect sizes, 23,663 observations; average d = 0.41, but over one third of feedback interventions *decreased* performance; feedback that shifts attention to the self (away from the task) is the main hazard. — [PDF](https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/The%20effects%20of%20feedback%20interventions.pdf)
- **[Review]** Hattie & Timperley (2007): four levels (task, process, self-regulation, self); self-level feedback (person praise, "you're so smart") is least effective and potentially negative; task and self-regulation levels most useful. (Secondary summaries.) — [Corwin](https://corwin-connect.com/?p=12667); [Research School](https://researchschool.org.uk/sandringham/news/effective-feedback)
- **[MA]** Deci, Koestner & Ryan (1999): positive feedback enhanced free-choice intrinsic motivation; contingent tangible rewards reduced it (d = −0.28 to −0.40). — [PDF](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf)
- **[Lab]** Mekler et al. (2017): points/levels/leaderboards neither raised nor lowered intrinsic motivation; authors argue elements perceived as *informational* may support competence. — [Unibas](https://edoc.unibas.ch/32047/)
- **[Lab]** Etkin (2016): numeric output feedback increased quantity, reduced enjoyment. — [Wharton PDF](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Etkin-Jordan-11-12-15-Hidden-Cost.pdf)
- **[Practitioner, large-N]** Duolingo: commitment-framed CTA copy ("commit to my goal") outperformed "continue". — [Interview highlights](https://videohighlight.com/v/_CCwoQZH5hI)

### Inferences
- Post-session feedback should be informational and task/process level ("45 min on linear algebra, 2nd session this week, next review due Thu"), not person praise ("you're amazing"); celebration animations are fine as affect, but the content shown should carry information.
- Because engagement-contingent rewards are the most undermining type, avoid coins/XP for merely logging a session. If any reward is used, make it unexpected and informational (recognition of a milestone), and expect a motivation dip if a reward scheme is later removed.
- Kluger & DeNisi imply that comparative feedback that draws attention to the self (rank, "below average") is the most likely to backfire, consistent with the leaderboard findings.

### Gaps
- No peer-reviewed evidence on *variable/unpredictable rewards* in learning apps was retrieved (search budget exhausted before this query); Nir Eyal's "Hooked" treatment is practitioner material grounded in operant conditioning, not education trials.
- "Celebration" moments (BJ Fogg) have no located empirical test; the closest evidence is the positive-feedback moderator in Deci et al.

---

## 9. Identity-based habits, habit-formation timelines, cue-routine-reward, habit stacking

### Takeaway
Habit automaticity takes a median ~59–66 days to plateau with enormous individual variation (18–254 days in Lally; 4–335 days in the 2024 review) and is slower for effortful behaviours like exercise, so a study app should not promise "21 days" and should expect 2–5 months. Anchoring a new behaviour to an existing routine ("after X, I will study") produced stronger habits at 8 months in a small trial (habit stacking). Identity framing is theoretically supported (habit–identity links strengthen when behaviours are tied to values) but the famous "be a voter" field result failed a large replication.

### Cited Findings
- **[Obs, longitudinal]** Lally et al. (2010): self-rated automaticity followed an asymptotic curve; median 66 days to plateau, range 18–254 (upper bound extrapolated beyond the 84-day study); the 66-day figure is based on 39 participants with good curve fits; about half of participants had not reached the habit threshold by day 84; exercise behaviours took ~1.5× longer than eating/drinking behaviours. — [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit); [Behavioral Scientist explainer](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)
- **[Registered report]** A replication preprint notes Lally et al. was based on 39 participants and "has not been replicated yet". — [PCI RR PDF](https://rr.peercommunityin.org/download/t_recommendations.reply_pdf.8382af6b73bdd0f7.6d616e757363726970745f7072657072696e742e706466.pdf)
- **[MA]** Singh, Murphy, Maher & Smith (2024, *Healthcare* 12(23), 2488): 20 studies, 2,601 adults; only 4 studies reported time to habit: medians 59–66 days, means 106–154 days, individual range 4–335 days. — [Adelaide record](https://digital.library.adelaide.edu.au/items/fe6ba93e-1d6b-42b8-9ee7-a231a64ff006); [BPS summary](https://www.bps.org.uk/research-digest/how-make-habit-stick)
- **[RCT, small]** Judah, Gardner & Aunger (2013, *British Journal of Health Psychology*), 50 participants: flossing *after* brushing (anchored to the end of an existing routine) produced stronger automaticity and more frequent flossing at 8 months than flossing before brushing; prior behaviour and positive attitude also predicted habit strength. — [LSHTM record](https://researchonline.lshtm.ac.uk/id/eprint/275190); [Psychology Today summary](https://www.psychologytoday.com/us/blog/dont-delay/201310/you-can-develop-desired-health-behaviors)
- **[Lab, 2 studies]** Verplanken & Sui (2019, *Frontiers in Psychology*; doi:10.3389/fpsyg.2019.01504): habit–identity ("true self") associations were stronger when participants generated habits while indicating the values they serve; authors propose linking habits to identity may sustain new behaviours. — [PMC6635880](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6635880/)
- **[Field]** Bryan et al. (2011, *PNAS*): noun framing ("be a voter") vs verb ("vote") increased registration interest and turnout in two state elections. — [PMC3150938](https://pmc.ncbi.nlm.nih.gov/articles/PMC3150938/)
- **[Field, null replication]** Gerber et al. (2016, *PNAS*): large field experiment found no significant difference between noun and verb framing (point estimate ≈ 0); a 2018 follow-up also null. Original authors contest the replication context (low-salience primaries). — [PMC5087036](https://pmc.ncbi.nlm.nih.gov/articles/PMC5087036); [LSE record](https://eprints.lse.ac.uk/85000); [Replication Index critique](https://replicationindex.com/2019/12/02/christopher-j-bryan-claims-replicators-p-hack-to-get-non-significant-results-i-claim-he-p-hacked-his-original-results/)
- **[Practitioner]** James Clear's "Atomic Habits" and BJ Fogg's "Tiny Habits" popularise identity framing, habit stacking and anchor routines; the empirical bases located are Judah et al. (anchoring) and Verplanken & Sui (identity); the "2-minute rule" has no located trial.

### Inferences
- The heatmap's time axis should be designed for a 2–5 month horizon (e.g., milestone markers at 30/60/90/120 days) with explicit messaging that variability is normal, rather than a single "habit formed" badge at day 21 or 66.
- Onboarding should ask for an anchor ("after dinner", "after the last class") and generate the if-then plan from it; this combines Judah et al. with the implementation-intention evidence.
- Identity cues ("you are a person who shows up") are low-cost and consistent with SDT internalisation, but should not be sold as proven; the voter-noun replication failure is a caution.

### Gaps
- Lally et al.'s often-quoted finding that missing a single day does not materially affect habit formation was not confirmed in retrieved sources (relevant to streak forgiveness).
- No habit-formation timeline study in adolescents or on studying specifically was found; all timeline data are adult health behaviours.
- Cue-routine-reward (Duhigg) was not searched; it is a popularisation of operant/habit research rather than a distinct evidence base.

---

## 10. Teenagers: autonomy sensitivity, status and respect, purpose, peer influence

### Takeaway
Adolescents are motivated by status, respect and autonomy; interventions that feel controlling or manipulative provoke resistance, while those that confer respect or connect work to a self-transcendent purpose produce internalised change (Yeager, Dahl & Dweck 2018). A single brief "purpose for learning" exercise raised high-school science/maths GPA over months and increased persistence on boring tasks, while self-oriented "it's interesting/fun" motives did not reliably help (Yeager et al. 2014, >2,000 adolescents). SDT reviews add that autonomy-supportive contexts increase autonomous motivation and outcomes.

### Cited Findings
- **[Review]** Yeager, Dahl & Dweck (2018, *Perspectives on Psychological Science*): traditional interventions fail when they do not align with adolescents' heightened desire to feel respected and accorded status; successful examples use status directly, give more respectful treatment by adults, or reduce threats to status/respect (domains: snacking, middle-school discipline, high-school aggression); when adolescents sense manipulation or autonomy threat they resist. — [PMC5758430](https://pmc.ncbi.nlm.nih.gov/articles/PMC5758430); [UCLA CDA summary](https://developingadolescent.semel.ucla.edu/topics/item/why-interventions-to-influence-adolescent-behavior-often-fail-but-could-succeed); [APS](https://www.psychologicalscience.org/journals/perspectives/1745691617722620/)
- **[RCT + Obs, 4 studies]** Yeager et al. (2014, *JPSP* 107(4), 559–580), "Boring but Important": >2,000 adolescents and young adults; self-transcendent purpose predicted persistence on a boring task and lower college dropout months later (Study 1); a brief one-time intervention improved high-school science and maths GPA over several months (Study 2); increased deeper learning on tedious review material and sustained self-regulation on an increasingly boring task (Studies 3–4); interest/enjoyment-based motives alone did not consistently produce benefits. — [PMC4643833](https://pmc.ncbi.nlm.nih.gov/articles/PMC4643833); [CU Experts abstract](https://experts.colorado.edu/display/pubid_164500); [KQED summary](https://kqed.org/mindshift/37020/how-a-bigger-purpose-can-motivate-students-to-learn)
- **[Practitioner/book, secondary]** Yeager's "mentor mindset": high expectations plus high support; "wise feedback" ("I have high standards and I know you can meet them"); "cognitive bridging" (asking how today's skill helps a future goal); status anxiety emerges roughly ages 10–25. — [Edutopia](https://www.edutopia.org/article/the-science-of-student-motivation); [UT Austin](https://utw11345.utweb.utexas.edu/the-mentor-mindset/)
- **[Critique]** Cogmed commentary disagrees with the status emphasis, contrasting egocentric status striving with purpose beyond the self. — [Cogmed](https://cogmed.com/articles/how-to-motivate-young-people)
- **[Review]** Ryan & Deci (2020): autonomous motivation rises when autonomy, competence and relatedness are supported; many policies rely on controlling models. — [doi:10.1016/j.cedpsych.2020.101860](https://doi.org/10.1016/j.cedpsych.2020.101860)
- **[RCT]** Duckworth et al. (2011): MCII effect (>60% more practice questions) was obtained in 2nd-year high-school students. — [Konstanz PDF](https://www.socmot.uni-konstanz.de/sites/default/files/duckworth_self-regulation_11.pdf)
- **[Lab]** Etkin's quantification effect was shown in students (105 in one study); Hanus & Fox and Biwer et al. used university students; Ward et al. 520 undergraduates. (See sections 1, 3, 6.)

### Inferences
- For teens, copy and notifications that read as parental nagging ("You haven't studied today!") are the design most likely to trigger reactance; respectful, choice-preserving framing ("Your plan for today is ready when you are") aligns with Yeager et al.
- A purpose prompt at onboarding ("who or what will your studying help beyond yourself?") is cheap and has the strongest teen-specific causal evidence of anything in this note set; it should be self-transcendent, not "because it's fun".
- Status mechanics can be used, but Yeager's framing is status *through respect and contribution* (e.g., being a helper or mentor in a study group), not through rank, which section 3 shows harms low performers.

### Gaps
- Peer-presence effects on adolescent decision making (Gardner & Steinberg 2005) and SDT autonomy-support meta-analyses were not retrieved because the search budget was exhausted.
- No study of gamified or self-tracking study apps with adolescent samples was found; most app-related evidence is from university students or adults.
- Yeager's 2019 national growth-mindset trial and age-specific effect sizes for the 2014 GPA gain were not retrieved.

---

## Cross-cutting design implications (inferences synthesised from the sections above)

- **The heatmap is a behavioural log, and representation is the lever.** Render streak continuity generously (flexible definitions, repair windows, external attribution of misses), because the broken-streak penalty is driven by representation and self-blame, not by actual behaviour (Silverman & Barasch 2023).
- **Keep the record from becoming the goal.** Default to informational, low-salience numbers; let users hide totals; pair every visual with a next action (Etkin 2016; Jivet 2017; Kaliisa 2024).
- **Plans beat points.** The best-evidenced features are if-then planning at session end and a guided MCII/WOOP onboarding (d = 0.65; >60% more practice questions), followed by progress framing (endowed progress, goal gradient) and fresh-start timing of prompts.
- **Social features: accountability yes, rankings no.** Sharing progress with a chosen person strengthens monitoring effects; individual leaderboards demotivate low performers; body doubling is optional and unproven.
- **Rewards: informational feedback, not engagement-contingent tokens.** Contingent tangible rewards undermine intrinsic motivation (d ≈ −0.4); self-level praise is the least effective feedback.
- **Timelines: months, not weeks.** Expect 2–5 months to automaticity with wide variance; design milestones and messaging accordingly.
- **Teens: respect, autonomy and purpose.** Avoid controlling copy; add a self-transcendent purpose prompt; channel status into contribution rather than rank.
