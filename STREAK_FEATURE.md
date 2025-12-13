# Streak Feature - Design Document

## Overview
A streak system that encourages daily engagement by tracking consecutive days of logging moments (sunny/cloudy) across all spheres. The feature promotes consistent emotional processing and self-reflection.

---

## Core Concept

### What Counts as "Maintaining the Streak"
A day counts toward the streak if the user logs **at least one moment** (sunny or cloudy) to **any memory** in **any sphere**.

**Key Principles:**
- **Low barrier to entry**: Just one moment per day keeps the streak alive
- **Flexible**: Can log to any sphere (relationships, career, family, friends, hobbies)
- **Emotion-agnostic**: Both sunny and cloudy moments count equally
- **User-friendly**: Encourages daily check-ins without overwhelming commitment

### Streak Reset Conditions
- Missing a full calendar day (midnight to midnight in user's timezone)
- The streak resets to 0 if no moments are logged for 24+ hours

---

## Visual Design

### 1. Home Screen Badge Location
**Position**: Top-right corner of the screen, aligned with the Sferas header

```
┌─────────────────────────────────────┐
│  ← Sferas            🔥 12 days    │  <- Streak badge here
│                                      │
│            ┌────────┐               │
│            │  47%   │               │  <- Central progress avatar
│            └────────┘               │
│                                      │
└─────────────────────────────────────┘
```

**Rationale**:
- Top-right is a common location for achievement indicators
- Doesn't interfere with central progress avatar
- Visible immediately on app launch
- Consistent with modern app conventions (e.g., Duolingo, Snapchat)

### 2. Badge Design

#### Active Streak (1+ days)
```
┌──────────────┐
│  🔥 12 days  │
└──────────────┘
```

**Visual Properties:**
- **Fire emoji** (🔥) as the primary icon - universally recognized for streaks
- **Pill-shaped badge** with rounded corners (borderRadius: 20)
- **Semi-transparent background**: `rgba(255, 87, 34, 0.15)` (orange tint)
- **Border**: 2px solid with gradient `#FF5722` → `#FF9800` (warm orange to amber)
- **Text color**: `#FF5722` (vibrant orange)
- **Font**: Bold, 14px
- **Padding**: 8px horizontal, 6px vertical
- **Shadow**: Subtle glow effect matching the fire theme

#### Zero Streak (No active streak)
```
┌──────────────┐
│  💫 0 days   │
└──────────────┘
```

**Visual Properties:**
- **Sparkle emoji** (💫) instead of fire - suggests potential
- **Muted colors**: Gray/desaturated appearance
- **Background**: `rgba(158, 158, 158, 0.1)` (subtle gray)
- **Border**: 2px solid `#9E9E9E` (medium gray)
- **Text color**: `#757575` (darker gray)
- **Same size/shape** as active badge for visual consistency

### 3. Animation

#### On App Launch
When the user opens the app:
1. **Fade in** (0.3s delay after home screen loads)
2. **Scale pulse** (1.0 → 1.1 → 1.0) over 0.6s with spring animation
3. **Shimmer effect** if streak increased since last session

#### Streak Milestone Celebrations
When reaching milestones (3, 7, 14, 30, 60, 100, 365 days):
1. **Confetti animation** bursting from badge
2. **Scale up + rotate** (360° spin)
3. **Color shift** to gold/rainbow gradient temporarily
4. **Haptic feedback** (medium impact)
5. **Toast notification**: "🎉 7-day streak! You're on fire!"

#### Daily Reset Warning
When streak is at risk (no moments logged by 8 PM):
1. **Gentle pulse animation** every 5 minutes
2. **Color shift** to yellow/warning state
3. **Local notification** at 8 PM: "Keep your 12-day streak alive! Log a moment today 🔥"

---

## Data Structure

### AsyncStorage Schema
```typescript
interface StreakData {
  currentStreak: number;           // Current consecutive days
  longestStreak: number;          // All-time record
  lastLoggedDate: string;         // ISO date string (YYYY-MM-DD)
  streakStartDate: string;        // When current streak began
  totalDaysLogged: number;        // Lifetime stat
  milestones: number[];           // Array of achieved milestones [3, 7, 14...]
}

// Storage key
const STREAK_DATA_KEY = '@sferas:streak_data';
```

### Example Data
```json
{
  "currentStreak": 12,
  "longestStreak": 28,
  "lastLoggedDate": "2025-12-13",
  "streakStartDate": "2025-12-02",
  "totalDaysLogged": 87,
  "milestones": [3, 7, 14]
}
```

---

## Implementation Logic

### Streak Calculation Algorithm

```typescript
function updateStreak(momentTimestamp: number): StreakData {
  const today = getLocalDateString(new Date());
  const yesterday = getLocalDateString(subtractDays(new Date(), 1));

  const streakData = await getStreakData();
  const lastLogged = streakData.lastLoggedDate;

  // Case 1: Already logged today - no change
  if (lastLogged === today) {
    return streakData;
  }

  // Case 2: Logged yesterday - increment streak
  if (lastLogged === yesterday) {
    const newStreak = streakData.currentStreak + 1;
    const newMilestones = checkMilestones(newStreak, streakData.milestones);

    return {
      ...streakData,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastLoggedDate: today,
      totalDaysLogged: streakData.totalDaysLogged + 1,
      milestones: newMilestones,
    };
  }

  // Case 3: Gap detected - reset streak
  return {
    ...streakData,
    currentStreak: 1,
    lastLoggedDate: today,
    streakStartDate: today,
    totalDaysLogged: streakData.totalDaysLogged + 1,
  };
}

function getLocalDateString(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
```

### Milestone Definitions
```typescript
const STREAK_MILESTONES = [
  { days: 3, label: "3-day streak", reward: "🌟" },
  { days: 7, label: "1 week streak", reward: "⭐" },
  { days: 14, label: "2 weeks strong", reward: "💪" },
  { days: 30, label: "1 month streak", reward: "🏆" },
  { days: 60, label: "2 months dedicated", reward: "🔥" },
  { days: 100, label: "100-day legend", reward: "👑" },
  { days: 365, label: "1 year champion", reward: "🎯" },
];
```

---

## User Experience Flow

### First-Time User
1. **Badge appears** with 0 days on home screen
2. **Tooltip on first launch**: "Log moments daily to build your streak! 🔥"
3. **After first moment**: Badge animates to "🔥 1 day" with celebration

### Daily User Journey
1. **Open app** → See current streak badge
2. **Log a moment** → Streak updates if new day
3. **Reach milestone** → Celebration animation + toast
4. **Evening reminder** → Notification if no moments logged by 8 PM

### Returning After Break
1. **Streak reset** → Badge shows "💫 0 days"
2. **Motivational message**: "Start fresh! Every journey begins with day 1 🌱"
3. **Show longest streak**: "Your record: 28 days - you can beat it!"

---

## Interaction Design

### Tap Behavior
**Tap the streak badge** → Opens streak details modal

#### Streak Modal Content
```
┌─────────────────────────────────────┐
│           Your Streak 🔥             │
│                                      │
│         ┌──────────────┐            │
│         │   12 days    │            │
│         └──────────────┘            │
│                                      │
│  📈 Current Streak: 12 days         │
│  🏆 Longest Streak: 28 days         │
│  📅 Started: Dec 2, 2025            │
│  ✨ Total Days Logged: 87           │
│                                      │
│  Milestones Achieved:                │
│  ✅ 3 days  ✅ 7 days  ✅ 14 days   │
│  ⬜ 30 days (18 to go!)             │
│                                      │
│  Keep it up! Log a moment today     │
│  to maintain your streak 💪          │
│                                      │
│          [ Close ]                   │
└─────────────────────────────────────┘
```

**Modal Features:**
- **Current streak** prominently displayed
- **Longest streak** for motivation
- **Streak start date** for context
- **Lifetime stats** (total days logged)
- **Milestone progress** with visual checkmarks
- **Next milestone countdown** (e.g., "18 to go!")
- **Encouragement message** for motivation

---

## Accessibility

### Screen Reader Support
- Badge: "Streak: 12 days. Tap to view details"
- Zero state: "No active streak. Start logging moments to begin your streak"
- Modal: Full content read aloud with structured navigation

### Color Blindness Considerations
- Don't rely solely on color (use icons + text)
- Fire emoji provides visual cue independent of color
- High contrast ratios (4.5:1 minimum)

### Reduced Motion
- Disable celebration animations if user prefers reduced motion
- Keep functional animations (fade in) but remove decorative ones
- Static confetti replacement: Simple border color change

---

## Notification Strategy

### Daily Reminder (8 PM Local Time)
**Condition**: No moments logged today AND streak > 0

**Notification Content:**
```
Title: Keep your streak alive! 🔥
Body: You're at 12 days - log a moment before midnight
Action: "Log now" (deep link to home screen)
```

### Milestone Reached
**Condition**: New milestone achieved

**Notification Content:**
```
Title: 🎉 7-day streak achieved!
Body: You're building a healthy habit. Keep going!
Action: "View streak" (deep link to streak modal)
```

### Streak Lost (Optional, gentler approach)
**Condition**: Streak broke yesterday (check at 9 AM)

**Notification Content:**
```
Title: Start fresh today 🌱
Body: Every day is a chance to begin again
Action: "Log a moment" (deep link to home screen)
```

---

## Analytics Events

### Tracking Points
```typescript
// Event 1: Streak updated
analytics.logEvent('streak_updated', {
  current_streak: 12,
  previous_streak: 11,
  is_new_record: false,
});

// Event 2: Milestone reached
analytics.logEvent('streak_milestone_reached', {
  milestone: 7,
  current_streak: 7,
  time_to_milestone_days: 7,
});

// Event 3: Streak reset
analytics.logEvent('streak_reset', {
  lost_streak: 12,
  longest_streak: 28,
  days_since_last_log: 2,
});

// Event 4: Streak modal viewed
analytics.logEvent('streak_modal_viewed', {
  current_streak: 12,
  longest_streak: 28,
});
```

---

## Edge Cases & Considerations

### Timezone Changes
- **Challenge**: User travels across timezones
- **Solution**: Always use device's local timezone for date calculations
- **Example**: If user logs at 11:50 PM in NYC, then flies to LA and logs at 9 PM LA time (which is 12 AM NYC next day), it still counts as consecutive days

### Clock Manipulation
- **Challenge**: User changes device time to cheat
- **Solution**: Accept it - trust users. Streak is for personal motivation, not competition
- **Alternative**: Could use server-side validation if backend is added later

### App Reinstall
- **Challenge**: User loses streak data
- **Solution**:
  1. Recommend cloud backup in settings
  2. Export/import streak data feature
  3. Future: Cloud sync via backend

### Offline Usage
- **Challenge**: User logs moments offline
- **Solution**: Queue moments locally, update streak when logged (based on moment timestamp)
- **Sync**: When online, validate streak against server (future enhancement)

---

## Future Enhancements

### Phase 2 Features
1. **Streak Freeze** (1 per week): Save your streak if you miss a day
2. **Social Sharing**: Share milestone achievements
3. **Streak Leaderboard**: Compare with friends (opt-in)
4. **Streak Challenges**: "Log 30 days in a row for exclusive badge"
5. **Sphere-Specific Streaks**: Track streaks per life sphere
6. **Weekly Insights**: "You logged most on Tuesdays"

### Gamification Ideas
- **Badges/Trophies**: Collectible rewards for milestones
- **Streak Levels**: Bronze (7), Silver (30), Gold (100), Platinum (365)
- **Personalized Encouragement**: AI-generated motivational messages
- **Progress Rings**: Visual rings showing progress to next milestone

---

## Development Checklist

### Phase 1 (MVP)
- [ ] Create `StreakData` interface and storage utilities
- [ ] Implement streak calculation logic
- [ ] Design and implement badge UI component
- [ ] Add badge to home screen (top-right)
- [ ] Create streak modal with stats
- [ ] Hook into moment creation flow
- [ ] Add celebration animations for milestones
- [ ] Implement local notifications (8 PM reminder)
- [ ] Add analytics tracking
- [ ] Test timezone edge cases
- [ ] Accessibility audit (screen reader, color contrast)
- [ ] User testing and feedback iteration

### Phase 2 (Enhancements)
- [ ] Streak freeze feature
- [ ] Export/import streak data
- [ ] Weekly summary notifications
- [ ] Reduced motion support
- [ ] Advanced milestone rewards
- [ ] Settings: Customize reminder time
- [ ] Settings: Toggle streak notifications

---

## Success Metrics

### Key Performance Indicators (KPIs)
1. **Daily Active Users (DAU)**: Increase by 25% after streak launch
2. **Retention Rate**: 7-day retention improves from X% to Y%
3. **Engagement**: Average moments logged per user increases by 30%
4. **Streak Adoption**: 60% of users reach 3-day milestone within first week
5. **Long-term Engagement**: 15% of users reach 30-day milestone within 2 months

### A/B Testing Opportunities
- **Reminder time**: 8 PM vs 7 PM vs user-selected
- **Badge position**: Top-right vs bottom-right
- **Celebration style**: Confetti vs simple pulse vs none
- **Notification tone**: Motivational vs gentle vs direct

---

## Conclusion

This streak feature is designed to:
- ✅ **Encourage daily engagement** without being pushy
- ✅ **Celebrate progress** with meaningful milestones
- ✅ **Be forgiving** (only needs 1 moment/day)
- ✅ **Integrate seamlessly** with existing app design
- ✅ **Support user growth** through emotional processing consistency

The implementation balances **gamification** (fun, rewarding) with **therapeutic value** (encourages regular self-reflection) while respecting **user autonomy** (gentle reminders, not guilt-tripping).
