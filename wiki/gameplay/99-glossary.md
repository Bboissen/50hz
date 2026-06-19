---
title: "Glossary"
type: "glossary"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "glossary", "terms", "definitions"]
summary: "Definitions for core gameplay, economy, grid, and scoring terms used across the 50Hz wiki."
related: []
---

# Glossary

## Breaker trip

A reliability failure caused by capacity overload or sustained supply/demand mismatch.

## Cash

Spendable money used to buy upgrades and reset breakers.

## Customer price

The customer-facing electricity price. Lower price attracts more customers. In this game, price is derived from efficiency.

## Demand

The total amount of electricity requested by all sectors at a given tick.

## Deterministic max capacity

The maximum normal customer load the player can subscribe against. It is capped by delivery grid capacity and dependable generation, excluding renewable and dam assumptions.

## Contract capacity basis

The capacity denominator used for efficiency and capacity-overload checks. For normal customer load it is deterministic max capacity. When fixed contracts are active it can include current renewable and water dam capacity up to total max capacity.

## Efficiency

The player's price/revenue score. It measures how close current contracted load is to the current contract capacity basis.

## Fixed contract

A shared first-come-first-served load offer such as a Business Contract or Data Center Contract. Once accepted, it adds constant load for a fixed time and cannot be cancelled.

## Grid capacity

The safe amount of electricity load the player's network can deliver.

## Grid utilization

```txt
current contracted load / contract capacity basis
```

High contract utilization is good for efficiency. Capacity utilization above 100% creates breaker risk.

## Load

The portion of shared demand that one company must serve.

```txt
load = total demand * subscribed load share
```

## Overload

A reliability danger state that begins when contracted load exceeds the current contract capacity basis.

## Supply/demand balance

How close delivered supply is to current demand. The safe band is within plus or minus 5%.

## Price elasticity

A number controlling how strongly customers move toward cheaper electricity. Must be greater than 1 in the canonical economy.

## Production match

How close delivered production is to customer load.

## Score

Cumulative generated profit used to determine match winner. Unlike cash, score is not spent.

## Strike

A major failure event caused by a breaker trip. It damages cash, trust, and final score, with extra penalties for active fixed contracts.

## Subscribed load share

The physical customer share currently connected to the player and creating load pressure.

## Target market share

The customer share the market wants based on current price. Used for revenue calculation and as the target toward which subscribed load share moves.

## Water dam

A limited buffer that can fill from rain or manual pump load and drain into power generation. Empty means no dam generation is possible; full means it cannot absorb more water.
