## Summary

- What changed?
- Why is this change needed?

## Touched Partitions

- [ ] Partition A (`data.js`, `storage.js`, `init.js`)
- [ ] Partition B (`level.js`, `map-logic.js`, `form.js`)
- [ ] Partition C (`*.test.js`)

> If more than one partition is checked, explain why this cannot be split into multiple PRs.

## Conflict Risk Checklist

- [ ] I confirm this PR only touches one partition's **core files**.
- [ ] If this PR touches multiple partitions, I have split the work into separate PRs, or documented why splitting is not feasible.
- [ ] For cross-partition work, merge order is planned from lower layer (usually Partition A) to upper/UI layer (Partition B).
- [ ] I reviewed likely conflict points and rebased on latest target branch.

## Testing

- [ ] Local tests were run
- [ ] No unrelated refactors included
