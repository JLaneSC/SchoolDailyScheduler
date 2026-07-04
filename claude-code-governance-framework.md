# Claude Code Governance Framework
### Karpathy's Three-Layer Method and Loop Engineering

This framework organizes the method into three layers you can build into your project: the spec, the verifier, and the environment. Each layer includes the underlying principle and a prompt you can adapt for your CLAUDE.md file or direct sessions.

---

## Layer 1: The Spec

AI models perform well on measurable tasks but struggle with context-dependent judgment calls, since they have no lived experience to draw signal from. The spec is how you transfer your understanding into a format Claude can act on. This goes deeper than plan mode; it means working with Claude to build a detailed, agreed-upon spec before any building starts.

**Three components to build into your spec process:**

1. **Uncover the actual goal, not just the task.** A request such as "create an end-of-month report" describes a task. The goal is the decision that report needs to drive. Have Claude interview you to surface this before work begins.
2. **Work agile, not waterfall.** Break work into small, scoped chunks with clear checkpoints rather than handing over the entire task at once. Review, adjust, and repeat at each stage instead of only seeing the final product.
3. **Push for precision.** The more specific you are, the fewer assumptions Claude has to make, and each assumption is a chance for drift from what you actually want. Have Claude verify key decisions explicitly so nothing gets missed.

**Sample CLAUDE.md prompt for this layer:**

> Before building anything, interview me to identify the actual goal behind this request, not just the stated task. Bias toward small, tightly scoped specs with clear checkpoints rather than a single large plan. Once the spec is drafted, verify key decisions with me explicitly to confirm nothing was assumed incorrectly.

---

## Layer 2: The Verifier

Claude is not an intrinsically motivated collaborator; it operates more like a librarian who can only answer from the books on hand, and who doesn't always know when a book is missing. Instructions like "make this better" don't work the way they would with a person. The lever that actually works is verification.

**Three places to build verification into your workflow:**

1. **Set evaluation criteria up front.** Define what "good" looks like with precision before Claude starts. "Make this look good" gives Claude nothing to check against. "The report must have three sections, each ending with a recommendation" does.
2. **Use a second model as critic.** Route complex output through a second AI system with a different knowledge base to catch what the first one missed or got wrong.
3. **Pull in external signal wherever possible.** Connect Claude to the actual system of record so it can confirm things rather than assume them, such as a deployment target it can check directly, or prior reports it can use as a format reference.

**Sample CLAUDE.md prompt for this layer:**

> Before marking any multi-step task complete, outline the evaluation criteria you're using to judge quality, and be precise rather than general. Where a second model or external system is available to check the output, use it. Where historical examples or reference files exist, pull from them rather than guessing at format or scope.

---

## Layer 3: The Environment

The spec and verifier need somewhere to live. The environment is the workshop: the tooling and system that let the first two layers function and compound over time, rather than starting from a blank chat every session.

**Four components to build into your environment:**

1. **A proper CLAUDE.md file.** This loads automatically at the start of every session and should cover: how the repo is structured, what custom skills exist and how they're routed, the architecture of your knowledge base, and the non-negotiable working rules Claude follows regardless of task.
2. **A personal knowledge base.** A folder structure of your own reference material and prior work that Claude can draw from, so answers come from your actual context rather than generic defaults. This becomes a durable asset over time.
3. **Reusable skills for repeated tasks.** Any task done more than once is a candidate for a custom skill. Skills improve with use, since repeated use is what surfaces where they break.
4. **Explicit permission tiers.** Sort actions into three buckets: always do (run on autopilot), ask first (needs a check before proceeding), and never do (hard limits). Note that a CLAUDE.md instruction like "don't touch this folder" is a request Claude can still override. For anything in the "never do" tier, enforce it with a pre-tool-use hook that blocks the write or edit at the tool level, not just the prompt level.

**Sample CLAUDE.md prompt for this layer:**

> Audit the current environment against three tiers: what should run without confirmation, what should be checked with me first, and what should never be touched regardless of instruction. For anything in the never-do tier, flag where a hook-level restriction is needed instead of a prompt-level instruction, since prompt-level rules can be bypassed.

---

## Layer 4: Loop Engineering

Once the spec, verifier, and environment are in place, the next step is deciding which tasks should stop being one-off prompts and become loops instead: a prompt that runs repeatedly on its own until a defined goal is verified as complete. Boris Cherny, the creator of Claude Code, describes his own workflow this way now; he no longer prompts Claude directly, he writes loops that prompt Claude for him.

**Four-condition test for whether a task should become a loop:**

1. **Does the task repeat?** One-time tasks stay as regular prompts.
2. **Is there a clear definition of done?** A loop needs a way to confirm completion, not just a description of the work.
3. **Can you afford the token cost?** A loop will keep re-prompting itself until it's satisfied, which can burn through tokens quickly if the goal isn't tightly scoped.
4. **Does the loop have the tools it needs?** It needs access to whatever lets it check its own work, such as the ability to hit a live URL, query a deployed system, or run a review skill.

If a task clears all four conditions, it's a candidate for a loop. If not, keep it as a standard prompt.

**Four building blocks every loop needs:**

1. **A trigger.** What starts the loop. Options range from `/loop` (runs locally, on an interval, stops if your machine closes), to `/schedule` (runs in the cloud on a set cadence), to a custom loop orchestration skill (a single saved skill that configures the goal, execution steps, and verification, and kicks the whole loop off with one command).
2. **Execution skills.** The saved, battle-tested instructions that do the actual work inside the loop. This is the block to get right before building anything else, since a loop without proven skills behind it will improvise in ways you didn't intend. A generic skill might tell you to cancel a run because of rain; a skill that already knows your actual preferences will give a different answer.
3. **Goal and verification.** Every loop needs both a stated goal and a rule that confirms the goal was met, since one without the other doesn't function. Technical goals are usually straightforward to verify (a site loads under a set time, a review skill approves the change). Non-technical goals take more work: you have to bridge an abstract standard to something checkable, such as having an email-review skill return "approved" or a 1-10 score rather than leaving quality as a vague judgment call.
4. **Output and memory.** The output is whatever the loop produces: a document, a codebase update, a live site, a message. Memory is the part people skip, and it's the part that prevents the loop from repeating the same mistakes every run. Record lessons learned and run history in a markdown file the loop reads and updates each time. Without that record, nothing compounds.

**Sample CLAUDE.md prompt for this layer:**

> Before converting a recurring task into a loop, run it through the four-condition test: does it repeat, is there a clear definition of done, can the token cost be justified, and are the necessary tools available to verify the result. Build the loop only on top of execution skills that have already been tested individually. Pair every goal with an explicit verification rule, and if the goal is not naturally quantifiable, define a skill that converts the judgment call into an approved/not-approved or scored output. Record lessons learned and run history to a memory file after each run so the loop improves over time instead of repeating the same errors.

**Two safeguards worth building in from the start:**

- **Loop training mode.** For the first several runs of a new loop, have it pause at each step for approval before continuing. This confirms the loop is doing what you actually want before it's left to run unattended, and it's cheaper than discovering a problem after tokens have already been spent.
- **Human checkpoints for low-quantifiability goals.** The less measurable a goal is, the more the loop should be broken into smaller stages with a person reviewing at the moments that would be costly to get wrong, such as picking a direction that shapes everything downstream. The more of these checkpoints get skipped, the more room the loop has to drift off course.

---

## The Underlying Principle

Across all four layers, the constant is that you can outsource execution but not understanding. The spec, verifier, environment, and loops all depend on you knowing the goal, what "correct" looks like, and what's actually at stake if something goes wrong. AI can't supply that judgment; the layers only work as well as your own clarity feeding into them.
