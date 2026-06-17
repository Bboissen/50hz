---
title: "Core Loop"
type: "loop"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "gameplay", "core-loop", "feedback", "anti-snowball"]
summary: "Defines the match loop, player cognitive loop, system relationship, feedback pattern, and anti-snowball principle."
related: []
---

# Core Loop

## Match loop

Each match is a short real-time single-player duel against an AI opponent, typically **180-300 seconds**.

Every simulation tick:

1. Update shared demand.
2. Update event timers and card effects.
3. Read player manual controls.
4. Update asset outputs with inertia.
5. Compute production, water dam, and grid state.
6. Compute contract utilization efficiency.
7. Compute customer price from efficiency.
8. Compute customer attraction and revenue.
9. Move subscribed/load share toward market attraction.
10. Compute real-time supply/demand balance and breaker risk.
11. Apply upgrades in progress.
12. Update score and presentation state.

## Gameplay loop

```txt
Read information
  -> switch to relevant screen
  -> adjust controls
  -> keep supply within 5% of demand
  -> maintain efficient contract utilization
  -> lower price
  -> gain customers and revenue
  -> detect mismatch pressure
  -> upgrade or limit growth
  -> survive events
```

## Player cognitive loop

The player should repeatedly ask:

```txt
What is demand doing?
Am I producing enough?
Am I producing too much?
Is the grid near overload?
Are new customers arriving too fast?
Is an event about to hit?
Do I need a fast fix or a long-term upgrade?
Am I taking a fixed contract that I can safely serve?
```

## System relationship

```txt
Contract utilization efficiency controls price.
Price controls market attraction.
Market attraction controls future contracted and real-time load pressure.
Supply/demand balance controls breaker risk.
Breaker risk forces manual action/upgrades.
```

## Correct feedback pattern

When a player performs well:

```txt
Efficiency rises.
Price falls.
Customers move toward them.
Cash gain rises.
Contract load rises.
Breaker alarms become more likely if they do not match supply to demand.
```

When a player performs poorly:

```txt
Efficiency falls.
Price rises.
Customers leave.
Cash gain falls.
Contract pressure decreases because they are losing customers.
They get a recovery opportunity.
```

## Anti-snowball principle

Gaining customers creates more load pressure, which makes future operation harder. Losing customers reduces pressure, which gives the losing player breathing room.

This is the natural comeback mechanic.
