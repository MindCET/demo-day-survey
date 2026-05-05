# Security Specification - Mindcet Demo Day

## Data Invarients
1. An investor cannot allocate more than the 'totalBudget' defined in global settings.
2. An investor can only see their own vote (unless aggregate data).
3. The Admin can manage startups and settings.
4. The Display screen can read aggregate data (or all votes for calculation).

## Dirty Dozen Payloads
1. Attempting to allocate $1,000,000 when the budget is $200,000.
2. Attempting to update another user's vote.
3. Attempting to change the status of the poll as a non-admin.
4. Attempting to delete the startups collection.
5. Injecting a startup with a malicious script in the description.
6. Spoofing ownerId to bypass ownership checks.
7. Sending negative allocation amounts.
8. Sending non-numeric allocation amounts.
9. Exceeding character limits in startup names.
10. Creating votes when the poll status is 'ended'.
11. Modifying 'createdAt' timestamps.
12. Creating multiple votes for the same userId (if enforced).

## Test Runner (Logic Outline)
- Voter trying to write to `/config/global` -> DENY.
- Voter trying to write to `/votes/malicious_id` with `investorId: their_id` -> DENY (must match document ID).
- Voter trying to write `allocations: { 'start1': -50000 }` -> DENY.
