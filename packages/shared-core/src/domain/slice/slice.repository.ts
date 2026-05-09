import { RepositoryPort } from "../shared/repository-port.js";
import type { Slice } from "./slice.entity.js";

export abstract class SliceRepository extends RepositoryPort<Slice> {}
