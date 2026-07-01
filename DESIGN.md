# DESIGN.md

# THE REALM

## Vision

The Realm is a three-round arcade game where every round explores a different style of gameplay while maintaining one consistent identity.

The game should always feel:

* understated
* deliberate
* rewarding
* readable
* stylish without becoming flashy

The player should feel skillful rather than lucky.

---

# Design Philosophy

The Realm avoids unnecessary visual clutter.

Rewards should be communicated through animation, timing, sound and colour rather than excessive text.

Every mechanic should have a clear visual language.

---

# UI Philosophy

All interface wording is lowercase.

Prefer short sentences.

Use periods.

Example:

```
wave 4.

choose your upgrade.
```

Avoid:

* ALL CAPS
* exclamation marks
* arcade style popups
* unnecessary floating text

The UI should resemble a minimalist JRPG rather than a classic arcade game.

---

# Round I

Whack-a-Mole

Primary mechanic:

Reaction.

Secondary mechanic:

Combo management.

## Purparlity

Purparlity is a reward.

Never a punishment.

Successful hit:

* magenta flash
* subtle bloom
* small screen shake

Do not display words.

Purparlity preserves combo.

Missing Purparlity does not reset combo.

---

## Combo

Combo rewards consistency.

Maximum multiplier:

7.5×

Combo decay:

```
7.5
↓

6.5

↓

5.5

↓

...
```

Never reset directly to x1 after a single miss.

---

# Round II

Invader

Primary mechanic:

Positioning.

Secondary mechanic:

Upgrade decisions.

Weapons must evolve visually.

Players should instantly recognise every projectile.

---

## Bullet

Small.

Fast.

Thin.

Yellow.

---

## Missile

Larger than bullets.

Always includes:

* nose cone
* body
* fins
* glow
* exhaust
* trail

Missiles must never resemble enlarged bullets.

---

## Wave 3

Upgrade:

Missile.

Missile impact destroys one complete vertical lane.

This reinforces lane control.

---

## Wave 4

Choose one evolution.

### nuka.

Launches a tactical missile.

Player must press a randomly selected key (A-Z).

Correct:

* launch
* destroy three adjacent vertical lanes
* 2 second cooldown

Incorrect:

* no launch
* 7 second cooldown

---

### machina.

Twin parallel rounds.

Higher fire rate.

No spread.

No random angle.

Precision weapon.

---

## Boss

Boss HP:

313

Bullet damage:

0.5

Missile damage:

7

Boss fights should encourage mixing bullets and missiles.

---

# Round III

Duel

Primary mechanic:

Timing.

Primary emotion:

Pressure.

Gambler's Gambit should remain the emotional climax of the game.

---

# Visual Language

Every upgrade should feel like an evolution rather than a replacement.

Bullet

↓

Missile

↓

Nuka

Each stage should clearly inherit the previous stage's visual identity.

---

# Audio

Sound effects should reinforce gameplay.

Avoid excessive audio.

Upgrades should have distinct sounds.

Missiles should sound heavier than bullets.

---

# General Rule

When adding new mechanics:

Prefer introducing new gameplay over simply increasing numbers.

Every upgrade should change how the player thinks, not only how much damage they deal.
