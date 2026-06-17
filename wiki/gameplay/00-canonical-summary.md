---
title: "Canonical Summary"
type: "canon"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "gameplay", "canon", "summary", "mvp"]
summary: "Compact source of truth for the 50Hz pitch, loop, strategic tension, systems, and MVP boundaries."
related: []
---

# Canonical Summary

## One-line pitch

**Grid Duel** is a single-player real-time electricity-grid control game where the player faces an AI opponent, and the provider with the best contract-to-capacity efficiency offers the cheapest price, attracts customers, earns more money, and risks breaker trips if supply and demand drift too far apart.

## Core player role

The player manages several operational surfaces under time pressure:

- production levers,
- grid overload monitors,
- customer/market pressure,
- weather and event forecast,
- bonus/malus cards,
- upgrade panel.

The pace should be closer to **manual crisis management** than to a spreadsheet simulation.

## Canonical loop

```txt
Contract load close to current capacity basis
  -> higher efficiency
  -> lower customer price
  -> more customer attraction
  -> more revenue
  -> higher real-time load pressure
  -> supply/demand mismatch risk
  -> manual response or upgrades
```

## Main strategic tension

The best player does not simply build the most power plants.

The best player keeps contracted load close to the optimal capacity basis while still handling real-time demand:

```txt
too little demand for your infrastructure = overbuilt and inefficient
too much real-time demand for your current supply = breaker risk
```

The player is trying to ride the edge:

```txt
high contract utilization, supply within 5% of demand
```

## Main systems

| System | Purpose |
|---|---|
| Efficiency | Measures contracted load against the current capacity basis and determines price/revenue advantage |
| Price | Customer-facing electricity price; lower is better for market attraction |
| Market attraction | Moves customers toward the cheaper company |
| Revenue | Rewards efficient operators with more cash |
| Supply/demand balance | Measures real-time delivered supply against current demand |
| Breaker risk | Converts unmanaged overload or underload into trips/strikes |
| Manual controls | Give the player real-time responsibility |
| Events/cards | Create synchronized shocks and tactical decisions |
| Upgrades | Expand capacity but can reduce efficiency if bought too early |

## MVP boundaries

Use synthetic gameplay numbers. External data is not a core mechanic for the first prototype.

Do not implement a deep real electricity market. The game must remain legible in a 1-2 minute demo.

The first version is explicitly not multiplayer. Time should go into the AI opponent, readable pacing, and strong single-player decision pressure instead of player-vs-player networking or matchmaking.
