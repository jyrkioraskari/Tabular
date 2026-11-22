# Attribution and source provenance

When copying, adapting, translating, or extracting code:

- Read the applicable LICENSE, NOTICE, and source-file headers.
- Preserve relevant copyright, licence, and attribution notices.
- Do not assume that refactoring, renaming, translation, or AI
  generation removes obligations attached to upstream code.
- Record the upstream project URL, revision if known, source files,
  and destination files in THIRD_PARTY_PROVENANCE.md.
- Carry required licence texts and notices into the distributed
  application or package; keeping them only in this repository
  may be insufficient.
- Distinguish upstream authorship from your own modifications.
- If origin or licence compatibility is unclear, flag the issue
  for maintainer review rather than inventing attribution.

Before completing a change:
- Check for removed or overwritten attribution headers.
- Check that release packaging includes required notices.
- Summarize reused components and where their credits appear.

These instructions support compliance with the applicable licences;
they do not replace or expand those licences.


# General instructions for AI-assisted coding

Apply these instructions across languages and frameworks. Scale the effort to the consequences of failure. Follow project-specific conventions and explicit requirements. Raise conflicts that affect correctness, compatibility, accessibility, or user data.

## Apply these instructions selectively

For every change, trace the affected workflow, preserve its contracts, and verify the requested outcome. Use the sections below when the change touches that subject. When adopting this guide in a repository, keep the always-loaded instructions short. Include local requirements an agent could easily miss, such as a compatibility promise, a domain invariant, or a non-obvious test command. Keep detailed design guidance available for the tasks that need it.

## Understand the job

- Identify who will use the change, what they are trying to accomplish, and what observable result counts as success. For ambiguous behavior, write one concrete input and expected outcome. Ask only when the answer would materially change the implementation and the available evidence cannot resolve it.
- Trace the normal entry point through the existing implementation. Read relevant callers, tests, sample data, and project instructions. Verify unfamiliar APIs against the installed version or its official documentation.
- Implement the smallest complete change that works through the user's normal workflow. Keep unrelated cleanup out of the diff.

## Design the interaction

- Use the user's vocabulary and the platform's familiar controls. Make the common task discoverable with sensible defaults. Put advanced choices where users need them. Add a setting only when users have a meaningful decision to make.
- Choose the interaction by the task. Use a form for structured input, a table for comparison, and direct manipulation for spatial work. Offer a keyboard-accessible alternative to dragging. For repeated batch work, consider a composable command or API. A conversational interface suits open-ended requests. Give users a way to inspect and edit consequential outputs. When a task crosses tools, carry the relevant selection, identifiers, and settings across the handoff. Verify that the receiving tool can use the result without manual re-entry.
- Show what happened, what is in progress, and what the user can do next. Cover empty, loading, success, partial-success, and failure states when reachable. Preserve valid input after errors. Give essential actions a visible, named route. A gesture or shortcut can speed up a familiar task. When simplifying a screen, check whether a first-time user can still find the action unaided. Prefer undo for reversible edits. Preview the scope before an irreversible bulk action.
- Follow the existing design system for typography, spacing, hierarchy, and component behavior. Use visual emphasis for the next meaningful action. Give icons accessible names and pair color-coded states with text or another cue.
- For web interfaces, target WCAG 2.2 AA by default. Prefer native semantic controls. Check labels, focus order and visibility, contrast, zoom and reflow. Exercise the changed workflow with a keyboard. For an unfamiliar or consequential workflow, observe a representative user attempt a realistic task and record where help was needed.

## Make complex software learnable

- Start with one useful, representative outcome. Organize the path around the user's decisions. Supply safe defaults for decisions the system can make, disclose defaults that affect interpretation, and let the user inspect or change them. Show a worked example at the point where an unfamiliar choice is required.
- Reveal specialized controls when they matter. Give optional groups visible, specific names such as “Units and identifiers”. Preserve the same terms, locations, and underlying behavior as users gain experience. Provide a direct route for repeated tasks, such as a reusable configuration or command, when repetition is part of the workflow.
- Prevent predictable errors and preserve the route forward. If an action has an unmet prerequisite, explain it next to the action. Preview the effect of consequential choices and preserve completed work when users go back or correct an error.
- For complex results, show scope and status first, then let users filter to a subset and inspect an individual item with its evidence. Keep the active filter, selection, and route back visible. Keep consequential warnings visible when details are collapsed.
- Test the progression. Ask a newcomer to complete the common task unaided, then give them a task requiring an initially collapsed option without naming it. Ask an experienced user to repeat a realistic task. Record correct outcomes, discovery, requests for help, recovery, and repeated effort separately.

## Lay out and size a user interface

- Start a sequential task in a single column. Keep a field's label, input, help, and error together. Add a second column when people need simultaneous comparison or a persistent preview. At narrow widths, stack panels in task order and keep the selected item identifiable. Use content width and zoom to choose breakpoints. Give tables and drawings the space their task requires.
- Reuse the project's type, icon, and spacing scales. Use a smaller gap inside a group than between groups. Let buttons and fields grow with font size and translated labels. Size short inputs to suggest the expected answer. Give a workflow step one visually prominent next action when there is a clear next action.
- Size the visible icon and its interactive area independently. A 24 dp glyph inside a 48 × 48 dp Android button is a useful starting example. For iOS touch controls, start at 44 × 44 pt. On the web, WCAG 2.2 AA criterion 2.5.8 specifies 24 × 24 CSS px or a qualifying exception, including its defined spacing condition. Favor larger targets for frequent touch actions. Check actual clickable bounds and neighboring controls. Use the project's icon family and pair unfamiliar icons with visible text.
- Use one term for each concept across navigation, controls, help, and error messages. Choose words people use when describing the task. Label actions with a verb and its object when the object matters, for example “Export selected rows”. Keep field labels visible after entry. State what an error affects and how to fix it. Test ambiguous labels by asking users what they expect to happen before they click.
- Define named color roles for surface, text, action, focus, selection, warning, and error. Apply them consistently across themes. Reserve strong accents for meaningful emphasis. Pair status colors with words or symbols. For web AA, check at least 4.5:1 contrast for ordinary text, 3:1 for large text, and 3:1 against adjacent colors for visual information required to identify active controls, states, and meaningful graphics, subject to WCAG exceptions. Check the rendered states and backgrounds.
- Evaluate comprehension and appeal separately. Give a first-time user a realistic task without naming the control. Observe the first action, completion, errors, and requests for help. Afterward ask how easy and visually appealing the experience felt, and why. When comparing layouts, use equivalent content and tasks and vary presentation order. Apply findings to the audience and task tested.

## Choose a palette, visual character, and tone

- Build the palette on one representative screen. First establish hierarchy in grayscale with spacing, alignment, typography, and boundaries. Assign neutral roles for page, surface, body text, and supporting text. Introduce an action accent, then add selection, focus, and status roles as needed. Reuse named roles across components. A brand color can supply the accent if its foreground and background combinations pass the relevant contrast checks.
- Test color pairs in context. Inspect text on buttons, links on surfaces, focus outlines on adjacent backgrounds, and text on selected rows. Include hover, focus, selected, error, and dark-mode states where supported. Give errors and selections explicit words or symbols. Review grayscale and color-vision simulations alongside contrast measurement and task testing.
- Choose chart colors separately from interface actions. Use distinct hues for unordered categories, an ordered lightness scale for increasing values, and a diverging scale when a meaningful reference such as zero or a target divides the data. Label the reference, units, and missing values. Keep category meanings stable across views.
- Make the visual character appropriate to the audience. Start from a recognizable layout and use consistent typography, alignment, and a restrained focal point. Remove competing decorative emphasis before hiding information users need. Compare designs with the same realistic content. Measure first impression, unaided task success, and preference after use separately.
- Use a calm, direct voice. Tell people what they can do, what will happen, and which choices can be changed later. Use a familiar verb, retain necessary domain terms, and explain an unfamiliar term at its first decision point. Avoid “simply”, “obviously”, or “just” when describing effort. For errors, state what happened, what was preserved if known, and one feasible next step. Claim a save, recovery, or undo only when the system supports it.
- Check approachability with new users: before the first action, ask what they expect to happen and whether anything makes them hesitate. Then observe whether they start, finish, and recover unaided. Use their explanation to decide whether to change the wording, appearance, or interaction.

## Design for perception and comprehension

- Name the question the display must answer. Use a table to look up exact values, aligned bars or dots to compare magnitudes, a line to follow change over time, and a map or 3D view when location or geometry matters. For close quantitative comparisons, use position on a common scale. Label units, denominators, missing values, and uncertainty when they affect interpretation. Start magnitude bars at zero and use consistent scales across comparable panels.
- Group controls with the content they affect. Use proximity, alignment, type size, and whitespace to establish reading order before adding borders or color. Give the strongest emphasis to what the user needs to notice first. Check the layout with realistic content, long labels, and the densest supported view.
- Reduce avoidable memory demands. Keep options, units, earlier selections, and relevant evidence visible at the point of decision. Place comparable items side by side where space permits. Reveal secondary detail on demand while keeping consequential warnings visible. Treat claims about fixed attention spans or ideal item counts as hypotheses requiring evidence for this task.
- Provide an equivalent route to the information or action. For a chart, give the main finding in text and expose values through an accessible table when lookup matters. For a graph or 3D viewer, offer searchable objects or relationships and keyboard selection when the task requires finding or inspecting an item.

## Design for different abilities and contexts

- Identify barriers in the actual task. People of the same age, diagnosis, or experience level may use different strategies. Support user preferences for text size, contrast, and reduced motion. Use stable layouts, literal instructions, and recoverable steps for people who need help with attention, reading, or memory.
- Ensure blind users can identify controls, follow reading order, and hear important state changes. Support low vision and color-vision differences with zoom, legible labels, and redundant cues. For people with limited dexterity, provide adequately sized targets and alternatives to precise dragging or timed gestures. Caption spoken content and provide a visible equivalent for meaningful sounds.
- For multilingual audiences, allow translated labels to expand, respect text direction and locale, and make units explicit. Keep necessary domain terms and explain unfamiliar ones where users encounter them.
- Verify the task with the relevant access method. For consequential interfaces, involve people who encounter the identified barriers. Ask them to complete a realistic task and explain the result in their own words. Record errors, needed assistance, and recovery. When only technical checks are possible, report which human questions remain open.

## Choose algorithms and dependencies on evidence

- Start with a clear, correct baseline. Specify input sizes, distributions, required accuracy, ordering, and memory or latency constraints where relevant. Check worst-case behavior when inputs can grow or come from outside the system.
- For a material algorithm choice, compare credible alternatives on the same representative inputs. Use an independent correctness check. Include the cost of setup, indexing, I/O, or model calls when the user pays it. Record versions, workload, and variability for performance claims.
- When relying on a study or benchmark, check whether its data, hardware, metric, and baseline fit this project. For example, a fast indexed lookup may lose overall when a one-off import must first build the index. Measure the complete operation.
- Prefer an existing project capability, standard library, or mature dependency that meets the requirement. Before introducing a framework, establish the concrete limitation it solves and check compatibility, maintenance, license, accessibility where relevant, and migration cost. Evaluate trends with a small reversible experiment when they offer a measurable benefit.

## Keep code and data understandable

- Follow the repository's formatter, naming conventions, language idioms, and module boundaries. Use domain terms consistently. Keep rules that must agree in one place. Introduce an abstraction when it clarifies an existing responsibility or removes meaningful duplication.
- Keep domain calculations independently testable. Isolate external services, persistence, and UI details where they change independently. When a design decision is likely to change, identify which callers would need edits. If the change would spread, hide that decision behind the smallest stable interface that serves those callers. Document assumptions, units, invariants, and non-obvious decisions close to the code that relies on them.
- Treat public APIs, CLI options, defaults, file formats, identifiers, and saved data as contracts. Check existing callers and older data. For an intentional breaking change, document the impact, migration, and recovery path.
- Preserve source values and attribution when transforming or reusing data and code. Where results are inferred, distinguish inputs, derived values, and reviewed decisions. For AI features, verify outputs against explicit criteria and support uncertainty or abstention where errors matter.
- For consequential AI suggestions, evaluate the human decision with both correct suggestions and plausible wrong ones. Record incorrect acceptances, correct acceptances, and review effort separately. If users routinely accept errors, try showing the source evidence before revealing the suggestion and measure the trade-off.

## Use design patterns to clarify code

Start by reading one real call site. Name the difficulty a maintainer faces, such as a decision repeated in several places, an external format leaking into domain logic, or legal state transitions scattered across handlers. Reuse a familiar pattern when it makes that specific behavior easier to trace. Follow the language's idioms and the repository's existing conventions.

| When the reader needs to understand… | Use this structure |
|---|---|
| Which of several interchangeable rules applies | **Strategy.** Select the rule in one place and pass it to the operation that uses it. A named function can implement a strategy. |
| How an external API or format maps to domain concepts | **Adapter.** Translate types and errors at the boundary. Keep domain decisions in domain code. |
| What happens next in an ordered workflow | **Pipeline.** Let one coordinating function show the named steps in execution order. Make inputs, outputs, side effects, and failure behavior visible. |
| Which actions are valid at each stage | **Explicit state transitions.** Start with named states and a transition function or table. Keep the transition rule in one place. |
| How callers perform a common task spanning several components | **Facade.** Expose a domain-named operation that coordinates existing components. Keep their underlying rules in one place. |

Use names that explain the domain role, such as `resolveUnit` or `exportDataset`. Keep a straightforward conditional when the whole decision is local and readable. Introduce interfaces, base classes, or registries only when they solve a concrete problem. When refactoring, preserve observable behavior and check a representative caller. A reviewer should be able to trace the normal path from the entry point, find the rule that decides the outcome, and identify where to change it.

## Keep software maintainable across releases

- For an architectural change, name a plausible future replacement and trace its impact on callers. Keep the decision local where practical. Introduce an extension point when an actual variation or expensive change justifies it.
- For a release or toolchain change, build from a clean checkout with the documented command. Record the supported runtime, build tools, dependency resolution, and required external inputs. Where the ecosystem supports it, retain a lockfile or equivalent release manifest. Exercise a representative task using the packaged artifact so undeclared machine-local dependencies become visible.
- Upgrade dependencies in reviewable steps. Check affected behavior through a representative consumer, including output semantics. Use version numbers and release notes to scope verification. Keep the previously working configuration identifiable for recovery.
- When changing a public interface or persistent format, keep a small fixture or consumer from a released version. Test the compatibility direction the project promises, such as a new reader opening an old file. For deliberate incompatibilities, document the transition and verify migration on a copy before retiring the previous path.
- Record consequential design decisions beside the code or in the existing decision log: the constraint, the reason for the choice, and what would justify revisiting it. Keep the build command and compatibility checks executable so a future maintainer can verify those assumptions.

## Handle real operating conditions

- Validate input at trust boundaries, enforce permissions where actions execute, and use established security libraries. Keep credentials and sensitive content out of source, logs, tests, and external model requests unless that transfer is explicitly authorized and necessary.
- Design writes for interruption, retries, and concurrent use when those conditions are possible. Bound external waits. Retry only when repeated execution is safe. Report partial completion accurately and preserve a recovery path.
- For deployed changes with significant consequences, identify a user-visible failure signal and a practical rollback or recovery method. Use staged rollout when the deployment supports it.

## Verify before declaring completion

- Exercise a representative task through its real entry point. For a feature spanning components, agree on one observable outcome that exercises them together. For example, open an exported file in its intended consumer and retrieve the item the user selected. Check the most consequential boundary or failure case. For a bug fix, reproduce the failure and add a focused regression check when existing tests would miss it.
- Derive expected results from the requirement, a trusted example, or an independent implementation. A test that repeats the production calculation can reproduce the same mistake. When a complete expected output is expensive to establish, test a relationship between two runs. For example, reordering records that the contract defines as unordered should preserve the resulting facts. Compare outputs at the level the contract promises. Keep a trusted example as well, since two incorrect outputs can still satisfy the relationship.
- Run the relevant project checks and inspect the final diff for unintended behavior, dependencies, and unrelated edits. Report what changed for the user, what was actually verified, and any remaining uncertainty. Claim usability, speed, compatibility, or standards conformance only to the extent the evidence supports it.

## Reference points

- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [Nielsen Norman Group usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [NIST Secure Software Development Framework](https://doi.org/10.6028/NIST.SP.800-218)
- [Google SRE guidance on canary releases](https://sre.google/workbook/canarying-releases/)

- [Tamara Munzner, Visualization Analysis and Design](https://www.cs.ubc.ca/~tmm/vadbook/)
- [Colin Ware, Information Visualization: Perception for Design (bibliographic reference)](https://static.ias.edu/pitp/2016/sites/pitp/files/munzner_notes.pdf)
- [Cleveland and McGill, Graphical Perception (experimental study)](https://doi.org/10.1080/01621459.1984.10478080)
- [W3C cognitive and learning accessibility guidance](https://www.w3.org/TR/coga-usable/)

- [Gloaguen et al., Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)
- [Parnas, On the Criteria To Be Used in Decomposing Systems into Modules](https://doi.org/10.1145/361598.361623)
- [Segura et al., A Survey on Metamorphic Testing](https://doi.org/10.1109/TSE.2016.2532875)
- [Buçinca et al., To Trust or to Think](https://arxiv.org/abs/2102.09692)

- [Crossing the chasm with beacon products in the portable music player industry](https://www.sciencedirect.com/science/article/abs/pii/S0166497213001144)
- [Podolny and Hansen, How Apple Is Organized for Innovation (insider account)](https://hbr.org/2020/11/how-apple-is-organized-for-innovation)
- [Nielsen Norman Group, iPad Usability: First Findings From User Testing](https://www.nngroup.com/articles/ipad-usability-first-findings/)

- [GOV.UK layout](https://design-system.service.gov.uk/styles/layout/) and [button wording](https://design-system.service.gov.uk/components/button/)
- [Apple interface design tips](https://developer.apple.com/design/tips/) and [Android accessible component defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)
- [W3C target size and spacing exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Tuch et al., visual complexity and first impressions](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)

- [ColorBrewer guidance on palette types](https://colorbrewer2.org/learnmore/schemes.html)
- [University of Michigan Library, Voice and Tone](https://design-system.lib.umich.edu/content/voice-and-tone/)
- [Stanford Guidelines for Web Credibility](https://credibility.stanford.edu/guidelines/index.html)

- [Raemaekers et al., Semantic Versioning versus Breaking Changes](https://doi.org/10.1109/SCAM.2014.30)
- [Collberg and Proebsting, Repeatability in Computer Systems Research](https://experts.arizona.edu/en/publications/repeatability-in-computer-systems-research/)

- [Carroll and Carrithers, Training Wheels in a User Interface](https://research.ibm.com/publications/training-wheels-in-a-user-interface)
- [Findlater and McGrenere, Evaluating Reduced-Functionality Interfaces According to Feature Findability and Awareness](https://dl.ifip.org/db/conf/interact/interact2007-1/FindlaterM07.pdf)
- [Shneiderman, The Eyes Have It](https://www.cs.umd.edu/users/ben/papers/Shneiderman1996eyes.pdf)
