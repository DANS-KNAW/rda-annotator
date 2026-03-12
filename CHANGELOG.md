# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.4.1](https://github.com/DANS-KNAW/rda-annotator/compare/1.2.0...1.4.1) (2026-03-12)


### Features

* add retry strategy for non-PDF orphaned annotations ([614a4f4](https://github.com/DANS-KNAW/rda-annotator/commit/614a4f4003b9e385da80810ab83cd1df1a7a8429))
* add URL blocklist and submit loading state ([f5949f4](https://github.com/DANS-KNAW/rda-annotator/commit/f5949f41f0c0c71310419ba6c85caf212680c428))
* **api:** add Authorization header to annotation requests ([4e443d1](https://github.com/DANS-KNAW/rda-annotator/commit/4e443d1239bce6b1970d156cc7cba9b50a040e00))
* **debug:** add logging for annotation data flow ([3cb11b0](https://github.com/DANS-KNAW/rda-annotator/commit/3cb11b088a52ff47970347a9514d9c163e4504bf))
* **e2e:** add helpers for orphaned annotation detection ([571919b](https://github.com/DANS-KNAW/rda-annotator/commit/571919b51bb54f041ee57556f59e33afdcb0e246))
* **schema:** add EOSC and SRIA vocabulary fields ([eba9626](https://github.com/DANS-KNAW/rda-annotator/commit/eba96264d03c77fce2ab53a4998013220f65c3b9))
* setup e2e tests and linter for QA ([08ee76a](https://github.com/DANS-KNAW/rda-annotator/commit/08ee76a5963a8867f83e2624b9c010cf6620202d))
* **vocabs:** made vocabularies dynamic not hardcoded ([363997d](https://github.com/DANS-KNAW/rda-annotator/commit/363997d0c1c3b14c2e12e0e7b2673c367b44e6cc))


### Bug Fixes

* **api:** send annotation_target field instead of target ([9665027](https://github.com/DANS-KNAW/rda-annotator/commit/966502785638bf474fbd1d54e57196c682c899dd))
* **api:** send target field instead of annotation_target ([3cae3cf](https://github.com/DANS-KNAW/rda-annotator/commit/3cae3cf1ca76066c2a6b2f34dfd05092357972e6))
* **auth:** preserve pending annotation during login flow ([9dddb47](https://github.com/DANS-KNAW/rda-annotator/commit/9dddb47bb25ab9c9c207f32c6884819942459b81))
* **display:** swap label/value priority for custom vocabulary badges ([b0d7b17](https://github.com/DANS-KNAW/rda-annotator/commit/b0d7b177fde1bf8075c7e11da03c5ede64b2c74d))
* **e2e:** Firefox PDF test infrastructure ([936d35e](https://github.com/DANS-KNAW/rda-annotator/commit/936d35e41868b76c6d7456ba375f246596aeceeb))
* **e2e:** handle cross-element text selection and configurable page wait ([5ab0863](https://github.com/DANS-KNAW/rda-annotator/commit/5ab0863beea0668d545c96294b4f549893fd382d))
* **e2e:** skip highlight tests on Firefox pending message investigation ([07cfd8d](https://github.com/DANS-KNAW/rda-annotator/commit/07cfd8d5bc91639cffeb4e61fb717f1b30e1c07b))
* **e2e:** skip invisible markedContent spans in PDF text selection ([629dc6e](https://github.com/DANS-KNAW/rda-annotator/commit/629dc6ef27b89e7f0bd54685b38a9afc4d989b44))
* **firefox:** PDF viewer detection, API bridging, and page-scoped anchoring ([958205d](https://github.com/DANS-KNAW/rda-annotator/commit/958205dbcea8bbb2c1241b089c4b293ec4ee5488))
* **firefox:** relay authentication through background script ([b939531](https://github.com/DANS-KNAW/rda-annotator/commit/b939531d0e97922167612d872dd74d2f01050311))
* **firefox:** relay highlight-sidebar interactions through background script ([ce31e59](https://github.com/DANS-KNAW/rda-annotator/commit/ce31e5947c597cfe5cd9c359c2db10a7917b9bcc)), closes [#1443253](https://github.com/DANS-KNAW/rda-annotator/issues/1443253)
* **firefox:** route sidebar messages through background script ([45b392d](https://github.com/DANS-KNAW/rda-annotator/commit/45b392dd8dc8bf4e5dd159c510a3e8ce80664c37))
* **highlight:** clear focused highlight on drawer close and filter clear ([1499752](https://github.com/DANS-KNAW/rda-annotator/commit/149975222954b38b10bda1ceb92d50bf597ffa9c))
* remove redundant vocabulary fields and fix link overflow ([e32a720](https://github.com/DANS-KNAW/rda-annotator/commit/e32a72093427cdc98e406ba173c23cf7e68e61e3))
* resolved incorrect error issue combobox ([280873e](https://github.com/DANS-KNAW/rda-annotator/commit/280873eb6c09e54bf84e6034b0ae414845d9caa1))
* resolved invalid test ([5d3525a](https://github.com/DANS-KNAW/rda-annotator/commit/5d3525a5603dc201653e5427c4c25f8d8e87a3b0))
* resolved linting warnings ([5202d00](https://github.com/DANS-KNAW/rda-annotator/commit/5202d00ffba8f8f4e89a7a2dab29a995e64773be))


### Styles

* **e2e:** apply lint formatting to test files ([11eeadf](https://github.com/DANS-KNAW/rda-annotator/commit/11eeadf4182abd4bb1d62bd96400d9a4deabcc55))


### Tests

* **e2e:** add ARDC CODATA vocabulary site annotation test ([00e8776](https://github.com/DANS-KNAW/rda-annotator/commit/00e8776eceea22dfcb861d417e1dd7f0dd409d98))
* **e2e:** add highlight persistence tests ([ef2ad09](https://github.com/DANS-KNAW/rda-annotator/commit/ef2ad096e91640f03edb3fc5bedeec403e28f3ac))
* **e2e:** add highlight-annotation interaction E2E tests ([564a8cf](https://github.com/DANS-KNAW/rda-annotator/commit/564a8cf9684b42581b693fc421883c205c8e5b9d))
* **e2e:** add reusable site-specific annotation test infrastructure ([30ca5b8](https://github.com/DANS-KNAW/rda-annotator/commit/30ca5b807ca530b73cf0b46d154ffcb17ca149a3))
* **e2e:** add site tests for whyqd, RO-Crate, Zenodo record and PDF ([a73fb0b](https://github.com/DANS-KNAW/rda-annotator/commit/a73fb0bdddc53b3ee977a9529968491e6d5b6f0d))
* **e2e:** PDF annotation multi-page E2E test ([b6da154](https://github.com/DANS-KNAW/rda-annotator/commit/b6da1544d046da5cf0319140d300c6b80aabd6d1))
* **e2e:** update tests for annotation_target field name ([222ba43](https://github.com/DANS-KNAW/rda-annotator/commit/222ba43a0e710ea6671be74d0205660fcf7a8cd6))
* **e2e:** update tests for target field and add mock server ([15ad271](https://github.com/DANS-KNAW/rda-annotator/commit/15ad271881f01cd7539cf4fa9c2e89954a33f84c))


### Build System

* add version release process with standard-version ([ec56454](https://github.com/DANS-KNAW/rda-annotator/commit/ec564548b6d7c6f02877bd105eaa545a77499ba5))
* configure standard-version tag prefix to match existing tags ([1491423](https://github.com/DANS-KNAW/rda-annotator/commit/1491423cb48cb63d909355beeec784c0fa3b0526))

## 1.3.0 (Initial tracked version)

This is the first version tracked with conventional changelog.
