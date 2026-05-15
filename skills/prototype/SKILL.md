---
name: prototype
description: "Use during research-slice to build disposable experiments that answer technical uncertainty."
version: "1.0.0"
tags: [process, research]
---

# Prototype

## When to Use in tff

During `research-slice`, when the slice contains technical unknowns (library behavior, integration pattern, performance characteristic). Produces throwaway code that answers a specific question.

## Goal

Build a throwaway experiment to validate a design assumption before committing to production implementation.

## Workflow

### 1. Identify the Question

State precisely what uncertainty the prototype must resolve. Examples:

- "Can this library parse our input format reliably?"
- "Does this query pattern perform under target load?"
- "Can these two services authenticate each other?"

### 2. Build the Experiment

Create minimal code beside its intended destination (same directory or adjacent file). Requirements:

- Clearly temporary naming (`prototype-*`, `spike-*`, `experiment-*`)
- Single command to run
- No persistence by default
- Skip tests, error handling, and polish
- Surface full relevant state after every action

### 3. Run and Observe

Execute the prototype. Record exact outputs, timings, and behavioral observations. Do not generalize beyond what was measured.

### 4. Trash or Fold

After the question is answered:

- **Trash**: delete the prototype and record the conclusion in `RESEARCH.md`
- **Fold**: incorporate validated patterns into the production implementation

If the user is not present, leave a placeholder note and record the answer in a durable place (commit message, ADR, or `RESEARCH.md`).

## Constraints

- Prototypes are explicitly temporary — never commit them to the production path without renaming and review
- Do not invest in production-quality guardrails (tests, error handling, logging)
- One prototype per question; do not combine multiple uncertainties into a single experiment
