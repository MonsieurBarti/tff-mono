import { createClosableStateStoresUnchecked } from "./src/infrastructure/adapters/sqlite/create-state-stores.js";

const stores = createClosableStateStoresUnchecked(":memory:");
stores.projectStore.saveProject({ name: "Test" });
stores.milestoneStore.createMilestone({ number: 1, name: "M1" });
const ms = stores.milestoneStore.listMilestones();
const mId = ms.data[0].id;
const s = stores.sliceStore.createSlice({ milestoneId: mId, number: 1, title: "S1" });
const sliceId = s.data.id;

// seed a review first
stores.reviewStore.recordReview({
	sliceId,
	reviewer: "rev-pre",
	type: "spec",
	verdict: "approved",
	commitSha: "abc",
	createdAt: new Date().toISOString(),
});

const path = ["researching", "planning", "executing", "verifying", "reviewing", "shipping"];
for (const target of path) {
	const r = stores.sliceStore.transitionSlice(sliceId, target);
	console.log("to", target, "ok:", r.ok, "error:", r.error?.errorLabel, r.error?.message);
}

const check = stores.sliceStore.getSlice(sliceId);
console.log("final status:", check.data?.status);

let called = 0;
const orig = stores.reviewStore.listReviews;
stores.reviewStore.listReviews = function (...args) {
	called++;
	console.log("listReviews called with", args);
	return orig.apply(this, args);
};

const closeResult = stores.sliceStore.transitionSlice(sliceId, "closed");
console.log(
	"close ok:",
	closeResult.ok,
	"error:",
	closeResult.error?.errorLabel,
	closeResult.error?.message,
);
console.log("listReviews called count:", called);

stores.close();
