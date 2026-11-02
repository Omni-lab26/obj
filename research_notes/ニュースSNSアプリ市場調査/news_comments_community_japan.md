# News Comment Sections and News-Driven Community in Japan (2023–2026)

Scope: whether people in Japan want to comment on and discuss news, how existing systems perform (ヤフコメ, NewsPicks, X/Threads, OpenChat, Discord), and what toxicity, moderation and regulatory problems a new app would face. It would have per-article comments, groups, DMs, events and user posts. Research date: 2026-11. Older data is labelled with its year.

## Q1. Yahoo!ニュース コメント (ヤフコメ): scale, problems, countermeasures

### Takeaway
ヤフコメ is still Japan's largest news comment space. In FY2024 it had about 114M comments a year, or about 9.5M a month (about 310k a day). That volume has held flat since FY2023, but it is far below the roughly 13.3M a month of FY2021. Posting comes from a small, heavily male minority, and a few heavy posters produce a large share of comments. LINEヤフー's approach is now "suppress before posting, rank, then delete". It requires a phone number to post, scores comments with AI, ranks constructive and diverse comments, nudges users with an AI comment-editing model, and auto-closes comment sections article by article. The service is not legally designated under the 情プラ法 but complies voluntarily.

### Cited Findings
**Scale (official, LINEヤフー メディア透明性レポート 2024年度版, published May 2025, covering FY2024 = Apr 2024–Mar 2025)**
- FY2024 ヤフコメ comments: 113,995,832, or about 9.50M a month. FY2023 was 111.272M (927.3万/month). The FY2024 figure includes new comment features on "みんなの意見" polls and Yahoo!ニュース エキスパート articles, and excludes profile settings. — [LINEヤフー メディア透明性レポート2024年度版 (PDF)](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Quarterly comments in FY2024: Apr–Jun 27.6M; Jul–Sep 30.7M (peak, about 10.2M/month); Oct–Dec 29.2M; Jan–Mar 26.5M. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Deletions in FY2024: 1,277,938 (about 106k a month), a deletion rate of 1.1%. FY2023 was 1.378M, or 1.2%. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Deletions by method: AI 54.0% (keyword detection 27.8%, 不適切投稿判定モデル 26.2%) and human review 46.0%. Human-review deletion reasons: 重複投稿 12.9%, 過度な批判・誹謗中傷 12.3%, 不謹慎 8.0%, 関連性なし 4.1%, 差別・ヘイト 3.6%, わいせつ・暴力 2.8%, 明らかな偽情報 0.0% (435 items). — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Who triggered deletions: 92.7% were found by LINEヤフー itself and only 7.3% followed user reports. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- User reports in FY2024: 3,357,780. Top reasons: 誹謗中傷・嫌がらせ 29.6%, 不謹慎・悪口 22.7%, 差別・ヘイト 13.7%, 明らかな偽情報 11.4%, off-topic 9.8%. Only 3.9% of reported items were deleted, which suggests users report disagreement much more often than real violations. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Posting suspensions in FY2024: 3,348, all for repeated policy violations. No suspensions are automated by AI. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Legal requests in FY2024 were tiny compared with volume. Out of court: 4 deletion requests (1 deleted) and 5 disclosure requests (0 disclosed). In court: 11 disclosure suits, with 5 orders to disclose. — [same PDF](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Historical comparison: in FY2021, Yahoo!ニュース posts were 159.2M a year (about 13.27M/month) and deletions were 5.131M (about 428k/month). — [Impress Watch, via search summary](https://www.watch.impress.co.jp/docs/news/1662602.html)
- Media coverage of the FY2024 report: LINEヤフー says deletions across its main services fell to less than a quarter of the FY2021 level while post volume held. It credits AI and human patrol plus pre-posting suppression. — [Impress Watch 2025](https://www.watch.impress.co.jp/docs/news/2037453.html); [マイナビ 2025-05-31](https://news.mynavi.jp/article/20250531-3340648/)

**Who posts (concentration). Older data, 2015–2016**
- Yahoo!ニュース blog (2015-09): about 40,000 users a day posted about 140,000 comments a day. — [橘玲 blog citing Yahoo data and 木村忠正『ハイブリッド・エスノグラフィー』 (orig. 2019, republished 2025-01)](https://www.tachibana-akira.com/2025/01/16049)
- One-week analysis from 2015 (木村忠正): about 56,000 IDs commented on about 10,000 hard-news articles. The top 1% of IDs wrote about 20% of comments, the top 2% (about 1,000 IDs, 71+ comments a week) about one third, and the top 10% about 60%. Over 80% of IDs posted fewer than 3 comments a week. Posters were over 80% male, and men in their 30s–40s were about half. — [same](https://www.tachibana-akira.com/2025/01/16049)
- 2016 web survey: about 1 in 3 to 1 in 4 comment readers also wrote comments. — [same](https://www.tachibana-akira.com/2025/01/16049)

**Countermeasures and timeline**
- 2021-10-19: AI auto-closure of comment sections article by article, applied when the aggregate violation score of an article's comments passes a threshold. In the first 2 months, 216 articles were closed (about 3.5 a day, about 0.05% of daily articles). By source: national papers and wire services 47, weekly magazines 42, TV 41. — [Yahoo!ニュース 公式 2021](https://news.yahoo.co.jp/newshack/information/20211019.html); [ITmedia 2022-01](https://www.itmedia.co.jp/news/articles/2201/20/news098.html)
- 2022-11: a mobile phone number became mandatory to post. Banned users' other IDs registered with the same number are also blocked. After the change, IDs suspended for malicious posting fell 56%. — [President Online 2023](https://president.jp/articles/-/67491); [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- "おすすめ順" ranking uses 3 models: (1) 不適切投稿判定モデル, which scores policy-violation risk and is used for auto-deletion and demotion; (2) 建設的コメント順位付けモデル, which scores comments on axes such as "raises discussion from one's own opinion" and "objective, with evidence where needed", trained on crowd labels; and (3) コメント多様化モデル, which clusters similar comments and surfaces a representative from each cluster to avoid one-sided top comments. Since Sept 2020 the constructive-comment model API has been offered free to outside media. — [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- 2024-09-09: "コメント添削モデル", an AI nudge that flags potentially offensive wording just before posting and suggests a rewrite (optional). Comparing 2024-08-12〜09-08 with 2024-09-09〜10-06, "不快なコメント" fell about 24%. About 50% of nudged comments were rewritten to a lower offensiveness score, and overall comment volume did not change. — [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf); also cited in [Reuters Institute DNR 2025 Japan](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/japan)
- Users can hide the comment section entirely, or hide specific users. Repeat violators get a warning message when they post. — [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- 2025-08: "ヤフコメ記事", AI-generated articles that summarise ヤフコメ comments, began distribution. — [search summary of Impress/Ryukyu Shimpo coverage](https://internet.watch.impress.co.jp/docs/yajiuma/2040517.html)
- Under the 情プラ法, LINEヤフー's designated services are 知恵袋, ファイナンス掲示板, LINEオープンチャット and LINE VOOM. Yahoo!ニュース コメント is not designated but follows the law voluntarily (a 7-day response target among other measures). LINEヤフー says it aims for a space where deletion is unnecessary ("削除しなくて済む空間"). — [Impress Watch 2025](https://www.watch.impress.co.jp/docs/news/2037453.html); [LINEヤフー届出リリース](https://www.lycorp.co.jp/ja/news/release/018392/)

### Inferences
- Comment volume of about 9–10M a month is large but stagnant to declining from FY2021 (about 13M). Stricter friction, such as the phone number requirement and AI nudges, likely cut volume and toxicity together. A new entrant should expect heavy-tail participation: a few percent of users writing most comments.
- AI-driven "proactive" moderation (92.7% self-detected) is now the Japanese benchmark. A new app needs similar automated scoring from day one, since user reports are noisy (only 3.9% of reports led to deletion).
- 誹謗中傷 and 不謹慎 dominate both reports and human deletions. 偽情報 is reported often (11.4%) but almost never deleted as "明らかな偽情報".

### Gaps
- No current (2023–2026) official figure for the share of ヤフコメ readers who post, or for unique posters a day. The latest concentration data is from 2015–2016.
- No public data on the FY2025 transparency report (expected around May–June 2026) was found in this search.
- No hard data found on how comments affect engagement metrics (time on site, PV). LINEヤフー only says it measures "コメント欄の閲覧者が増えているのか" when evaluating its ranking model.

## Q2. NewsPicks: expert "Picks" model, paid members, community and events, business performance

### Takeaway
NewsPicks pioneered "expert/named-user commentary on articles" in Japan. Paid membership plateaued at roughly 190k (peak 196k in Sept 2022, about 187k in Jan 2025 according to secondary media-kit references). ユーザベース stopped disclosing paid users and was taken private. This shows that expert-comment news has a ceiling as a paid consumer product in Japan.

### Cited Findings
- Paid members peaked at 196k (end of Sept 2022). ユーザベース then went private, and the CEO said they would "still make money from media". — [日経ビジネス (CEO interview on going private)](https://business.nikkei.com/atcl/gen/19/00304/020600118/)
- A Jan 2025 media kit reportedly shows about 187k paid members, down from 196k. One version of the media kit cites "12M+ registered users, 19.3万 premium (paid)", undated. These are secondary references, not IR. — [note: media_labo analysis](https://note.com/media_labo/n/nb7207a6f4971)
- ユーザベース reportedly stopped publishing paid-user counts after changing its disclosure method. — [same note, via search summary](https://note.com/media_labo/n/nb7207a6f4971)
- History: about 95k paid users in FY2018 (3.8M members); passed 100k in 2Q 2019; the 2019 goal was 1M paid members by 2023, which was never reached. — [Strainer](https://strainer.jp/companies/3530); [NewsPicks 2019 2Q 説明会レポート](https://newspicks.com/news/4141419/body/)
- "NewsPicks Expert" (an expert network/registry) passed 40,000 registrants in Oct 2025. — [NewsPicks corp 2025-10-14](https://corp.newspicks.com/info/20251014)
- An enterprise "NewsPicks Premium 法人契約プラン" can be bought for 3 or more seats, a B2B channel for paid subscriptions. — [ユーザベース](https://www.uzabase.com/jp/info/newspicks-premium-businessplan/)

### Inferences
- An expert-comment layer (verified professionals as "pickers") gives higher-quality discussion but limited mass reach. NewsPicks' paid base of about 190k against 12M registered users suggests about 1.5–2% conversion, and growth stalled after 2022.
- NewsPicks' content, events and video arm (NewsPicks Studios, live events) shows that "news + events" works for business-oriented audiences, but specific event or community metrics were not found.

### Gaps
- No primary 2024–2026 ユーザベース/ニューズピックス financials or official paid-member counts were found. The company is private and figures come from secondary analyses.
- No data on NewsPicks community features (e.g., "NewsPicks コミュニティ", events attendance) was found within the search budget.

## Q3. Other venues for news discussion in Japan (X, Threads, はてブ, 5ch/まとめ, OpenChat, Discord, note)

### Takeaway
X remains Japan's de facto real-time news discussion space; per a secondary source citing 総務省 2024, about 43% of people aged 13–79 use it. LINE is near-universal (about 91%). LINE OpenChat is a large topic-based chat layer with about 460M posts a month, and Discord has grown to an estimated 8M MAU in Japan. Closed and semi-closed group chat is clearly where much conversation volume sits.

### Cited Findings
- 総務省「令和6年度情報通信メディアの利用時間と情報行動に関する調査」(published 2025-06-27, n=1,800, ages 13–79): internet use time exceeds real-time TV across age groups. — [総務省 報道資料](https://www.soumu.go.jp/menu_news/s-news/01iicp01_02000125.html)
- From that survey, usage rates for all ages: LINE 91.1% and X 43.3%. These figures come from a third-party summary and have not been checked against the PDF. — [0120.co.jp summary](https://0120.co.jp/blog/video-113/); primary: [総務省 PDF](https://www.soumu.go.jp/main_content/001017160.pdf)
- LINE OpenChat FY2024 (Japanese phone-registered accounts): 5,514,828,787 posts (about 459.6M a month) and 6,982,455 deletions (about 582k a month, about 0.1%). Out-of-court deletion requests rose to 752 from 346 in FY2023, with 452 deletions, mostly for defamation and privacy. — [LINEヤフー 透明性レポート2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- LINE VOOM FY2024: 403.3M posts (33.6M a month) and 3.055M deletions. — [same](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Comparison: Yahoo!知恵袋 FY2024 had 66.2M posts (5.517M a month) and 444,727 deletions. — [same](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Discord in Japan: about 8M MAU and 4M DAU, about 70% male. This was presented at CEDEC2025 and is a secondary report of a talk, not an official filing. A 2023 gamer survey estimated about 10% active use and 5–10M active users. — [NAVICUS CEDEC2025 report](https://note.navicus.jp/n/nc54e1a62bd59?gs=76fc42a71129); [mottoi note 2023](https://note.com/mottoi/n/ne4736cbfeb35)
- X vs Threads (global, Similarweb): Threads mobile DAU overtook X in the week of 2025-09-15 (130.2M vs 130.1M) and led in Jan 2026 (143.2M vs 126.2M). Meta reported Threads passed 500M MAU in June 2026. In Japan, X is still described as the most popular SNS. — [Gizmodo Japan 2026-01](https://www.gizmodo.jp/2026/01/threads-is-now-clearly-more-popular-than-x.html); [Impress](https://www.watch.impress.co.jp/docs/news/2117803.html)
- Under the 情プラ法, designated large platforms include Ameba blog, 爆サイ.com and ニコニコ, alongside X, Meta (incl. Threads), YouTube, TikTok and LINEヤフー services. This confirms that anonymous local BBS (爆サイ) and niconico comment culture are significant venues. — [Impress Watch](https://internet.watch.impress.co.jp/docs/news/2011282.html); [総務省](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html)
- President Online (2023) reports that after ヤフコメ's crackdown, abusive commenters "lost their place" and migrated to other venues. — [President Online 2023](https://president.jp/articles/-/67491?page=2)

### Inferences
- Discussion volume is far larger in group-chat formats (OpenChat about 460M posts a month) than in open news comments (ヤフコメ about 9.5M a month). The appetite for talking appears much stronger in interest groups than under articles.
- Moderation displaces abuse rather than eliminating it. A new app with weaker controls risks becoming a destination for users pushed off ヤフコメ.

### Gaps
- No official Japan MAU for X (the often-cited 67M is from 2022–2023 and was not verified here) or for Threads in Japan.
- No current statistics found for はてなブックマーク comments, 5ch/まとめ traffic, note or Voicy community usage.
- No figure for OpenChat MAU or number of rooms, only post volume.

## Q4. Do people in Japan actually want to comment on and discuss news? (Demand evidence)

### Takeaway
Japanese users are internationally among the least active at publicly commenting on or sharing news. Most are readers, not writers, though readers value comment sections as a way to see others' opinions. Demand to write publicly is low; demand to read others' reactions is high. This argues for an app that makes reading reactions frictionless and offers smaller, safer spaces for actual conversation.

### Cited Findings
- Reuters Institute DNR 2025 (Japan): 13% share news via social, messaging or email; 10% pay for online news; trust in news 39% (-4). — [Reuters Institute DNR 2025 Japan](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/japan)
- Reuters DNR 2014 (older): only 3% of Japanese respondents commented on news websites, the lowest of 10 countries. Talking face to face about news, at 14%, was Japan's only double-digit participation item. Urban Brazil was 44%. — [小林恭子, Yahoo!ニュース エキスパート 2014-06-24](https://news.yahoo.co.jp/expert/articles/23a0a9ab3b807cd289ae6904b5a1e96791384e19)
- Oricon survey (2021-11, n=1,000, ages 20s–60s, nationwide internet survey): 12.2% had written comments on internet news, and men did so about twice as often as women. Comment sections were "necessary" for 41.4% and "unnecessary" for 21.4%. Among commenters, 62.3% said necessary. Moderation (hiding or blocking abusive comments) was "necessary" for 52.6% overall, 65.2% of non-commenters and 45.1% of commenters. The "necessary" side cited seeing diverse opinions and public sentiment and balancing one-way media. The "unnecessary" side cited abuse and extreme opinions. — [ORICON 2021](https://www.oricon.co.jp/special/57785/); [ORICON motives](https://www.oricon.co.jp/special/57896/) (sample description differed between the fetch and the search summary; the 12.2% commenter share implies a general-population sample)
- In the same Oricon research, over half of commenters gave "共感や応援" (empathy or support) as their motive for writing. — [ORICON](https://www.oricon.co.jp/special/57896/)
- NTTドコモ モバイル社会研究所 (2024-02, SNS users): fewer than 10% "often comment" on others' posts, about 40% have never commented, and sharing others' posts is most common among young men. — [モバイル社会研究所 2025-02-28](https://www.moba-ken.jp/project/lifestyle/20250228.html)
- BIGLOBE (2023, ages 20–50s): 10.9% said they had received abusive comments online and 6.3% admitted writing them, with the highest share among people in their 20s. — [BIGLOBE 2023-09](https://www.biglobe.co.jp/pressroom/info/2023/09/230907-1); [ITmedia](https://www.itmedia.co.jp/business/articles/2309/09/news040.html)
- 総務省 survey on 誹謗中傷 (2022) is available as a reference on how widely abuse is experienced. — [総務省 PDF 2022](https://www.soumu.go.jp/main_content/000813680.pdf)

### Inferences
- The realistic writer population for a news comment feature is about 3–12% of users, and it skews male and middle-aged in existing services. Features that let lurkers participate at low cost (reactions, polls like "みんなの意見", private sharing to friends or groups) likely matter more than open threads.
- The Japanese pattern of "talking face to face > commenting publicly" (DNR 2014), plus OpenChat/Discord volume, supports the hypothesis that people prefer discussing news in closer, trusted circles. This is an inference; no direct 2023–2026 survey on wanting to discuss news with friends was found.

### Gaps
- No 2023–2026 survey found that directly measures "wanting to talk about news with friends or family" in Japan (新聞通信調査会 reports may contain it but were not retrieved).
- No 2025 DNR Japan figure for "comment on news" was available on the country page.

## Q5. Regulation: 情報流通プラットフォーム対処法, 侮辱罪, 発信者情報開示, youth and dating-law risks for DMs and events

### Takeaway
Since 2025-04-01, the 情プラ法 (the amended プロバイダ責任制限法) imposes response-speed and transparency duties on designated large platforms. A new app would not be designated at launch, but sender-information disclosure rules and liability exposure apply to everyone, and the large platforms' practices set the de facto standard. 侮辱罪 penalties were raised in 2022. DM plus offline-event features carry 出会い系サイト規制法 risk if they function as opposite-sex introduction.

### Cited Findings
- The 情報流通プラットフォーム対処法 took effect on 2025-04-01 as an amendment of the プロバイダ責任制限法. Large platforms must speed up deletion handling and increase transparency. Within 3 months of designation they must file a notification, after which the main duties apply. — [Impress Watch](https://pc.watch.impress.co.jp/docs/news/2011055.html); [総務省](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html)
- Designations:
  - 2025-04-30 (Art. 20(1)): Google (YouTube), LINEヤフー (Yahoo! JAPAN services, LINE, LINE VOOM, etc.), Meta (Facebook, Instagram, Threads), TikTok, X.
  - 2025-05 additions: Pinterest, サイバーエージェント (Amebaブログ), 湘南西武ホーム (爆サイ.com), ドワンゴ (ニコニコ).
  - — [総務省](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html); [Impress](https://internet.watch.impress.co.jp/docs/news/2011282.html)
- Obligations as implemented by LINEヤフー (filed 2025-07-29):
  - Appoint a 侵害情報調査専門員 (infringement-information examiner).
  - Decide on a deletion request in principle within 7 days and notify the requester, or give the reason if it takes longer.
  - Publish deletion criteria with concrete examples.
  - Set up a request intake channel.
  - Publish transparency reports.
  - — [Impress Watch 2025](https://www.watch.impress.co.jp/docs/news/2037453.html); [LINEヤフー](https://www.lycorp.co.jp/ja/news/release/018392/)
- 発信者情報開示: victims can request disclosure of poster information (name, address, phone number, etc.). Since the 2022 amendment there is a new court procedure (発信者情報開示命令). Platforms receive both out-of-court and court requests; ヤフコメ had 11 court disclosure cases in FY2024 and OpenChat 8. — [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf); [総務省 FAQ](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html)
- 侮辱罪: the statutory penalty was raised from 拘留・科料 to "1年以下の懲役若しくは禁錮若しくは30万円以下の罰金又は拘留若しくは科料", effective 2022-07-07 (令和4年法律第67号). The statute of limitations went from 1 to 3 years, with a review 3 years after enforcement. (Since 2025-06, 懲役/禁錮 are unified as 拘禁刑.) — [法務省 Q&A](https://www.moj.go.jp/keiji1/keiji12_00194.html); [自民党](https://www.jimin.jp/news/information/203958.html)
- 出会い系サイト規制法 (インターネット異性紹介事業):
  - Operators of services that introduce people for opposite-sex dating must notify the Public Safety Commission before starting (mandatory since the 2008 amendment). Operating without notification is a criminal offence (6 months' imprisonment or a ¥1M fine).
  - Apps that don't use a bulletin board can still be classified as such based on actual use. Whether an SNS event or meetup feature is covered depends on the case.
  - The law covers only opposite-sex introduction.
  - Covered operators must verify users are adults (no minors).
  - — [東京スタートアップ法律事務所](https://tokyo-startup-law.or.jp/magazine/category06/definition-and-notification-of-matching-app-operator/); [警視庁](https://www.keishicho.metro.tokyo.lg.jp/kurashi/higai/kodomo/deai_saito.html); [ABEMA Times](https://times.abema.tv/articles/-/10146873?page=1); [Nexway eKYC](https://ekyc.nexway.co.jp/blog/107)
- LINEヤフー publishes youth-safety guidance for parents and educators on OpenChat, a sign that minors' contact with strangers is a recognised risk in topic-based open chat. — [Transparency report FY2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)

### Inferences
- A new app is unlikely to reach the designation threshold early. Even so, it should build 情プラ法-style processes from launch (7-day takedown decisions, published criteria, an examiner role, transparency reporting), since it would be compared with ヤフコメ and OpenChat and may face disclosure suits.
- DMs between strangers plus "events" (offline meetups) is the riskiest combination. To avoid being treated as an インターネット異性紹介事業 and to protect minors, the design should use interest or topic framing and avoid profile-based opposite-sex matching. Safeguards could include age verification and age-gating DMs and events for under-18s, restricting DMs to mutual follows or group members, and phone-number SMS verification like ヤフコメ.

### Gaps
- Exact designation thresholds for 大規模特定電気通信役務提供者 (the MAU or post-count criteria in the ministerial ordinance) were not retrieved; the 総務省 page fetch was garbled.
- Japan has no general statutory age-verification mandate for SNS comparable to Australia's under-16 ban. No 2025–2026 Japanese proposal was confirmed in this research.

## Q6. Evidence of demand for smaller, closer ("密な") communities vs big open comment sections

### Takeaway
Volume evidence strongly favours group or community formats. OpenChat carries about 48x ヤフコメ's monthly post volume, and Discord has an estimated 8M Japanese MAU. Public comment writing remains a minority activity concentrated in heavy users. No direct survey on wanting to discuss news in small groups was found, so this conclusion rests on behavioural proxies.

### Cited Findings
- OpenChat posts were about 459.6M a month in FY2024, against about 9.5M a month for ヤフコメ. — [LINEヤフー 透明性レポート2024](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- OpenChat's deletion rate (about 0.1%) is far lower than ヤフコメ's (1.1%), but OpenChat defamation and privacy deletion requests doubled year on year (752 vs 346). — [same](https://www.lycorp.co.jp/ja/company/transparencyreport2024.pdf)
- Discord Japan: about 8M MAU and 4M DAU (CEDEC2025 talk). The talk's framing describes Discord moving from a "遊び場" (playground) to a "居場所" (a place to belong). — [NAVICUS](https://note.navicus.jp/n/nc54e1a62bd59?gs=76fc42a71129)
- ヤフコメ heavy-tail data (2015): the top 2% of IDs write about one third of comments and attract about 45% of replies. Most ordinary users post fewer than 3 times a week. — [橘玲/木村忠正](https://www.tachibana-akira.com/2025/01/16049)
- Reuters DNR 2014: Japanese respondents talked about news face to face (14%) far more than they commented online (3%). — [小林恭子 2014](https://news.yahoo.co.jp/expert/articles/23a0a9ab3b807cd289ae6904b5a1e96791384e19)

### Inferences
- Open, article-level comments in Japan are dominated by a vocal minority and need heavy AI moderation. Smaller groups (friends, interest-based, local) match the behaviour Japanese users already show in LINE, OpenChat and Discord.
- A differentiated news app could treat per-article comments as a "read reactions" layer (ranked by constructiveness and diversity like ヤフコメ) and route active discussion into groups. Abuse migrates (President 2023), so group spaces still need moderation and reporting. OpenChat's rising defamation requests show that small-group spaces are not immune.

### Gaps
- No 2023–2026 Japanese survey found that directly asks about preference for discussing news in small or closed groups vs open comment sections.
- No data found on retention or engagement uplift from comments or communities in Japanese news apps (e.g., SmartNews, グノシー, NewsPicks).
