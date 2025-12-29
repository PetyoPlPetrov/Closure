/**
 * Smart suggestions for moments (hard truths, good facts, lessons) based on memory titles
 * Provides contextual placeholders that match the content of memories
 */

import { getTranslation, Language } from './languages/translations';

export interface MomentSuggestions {
  hardTruths: string[];
  goodFacts: string[];
  lessons: string[];
}

/**
 * Translation key structure for suggestions
 * Maps keywords to translation key arrays
 */
interface SuggestionKeys {
  hardTruths: string[];
  goodFacts: string[];
  lessons: string[];
}

/**
 * Keyword-based suggestions database
 * Each key represents words that might appear in a memory title
 */
const suggestionsByKeyword: Record<string, SuggestionKeys> = {

  // Birthday related

  birthday: {
    hardTruths: [
      'suggestions.birthday.hardTruths.0',
      'suggestions.birthday.hardTruths.1',

        'suggestions.birthday.hardTruths.2',
      'suggestions.birthday.hardTruths.3',

        'suggestions.birthday.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.birthday.goodFacts.0',
      'suggestions.birthday.goodFacts.1',

        'suggestions.birthday.goodFacts.2',
      'suggestions.birthday.goodFacts.3',

        'suggestions.birthday.goodFacts.4',
    ],
    lessons: [
      'suggestions.birthday.lessons.0',
      'suggestions.birthday.lessons.1',

        'suggestions.birthday.lessons.2',
      'suggestions.birthday.lessons.3',

        'suggestions.birthday.lessons.4',
    ],
  },

  // Anniversary related

  anniversary: {
    hardTruths: [
      'suggestions.anniversary.hardTruths.0',
      'suggestions.anniversary.hardTruths.1',

        'suggestions.anniversary.hardTruths.2',
      'suggestions.anniversary.hardTruths.3',

        'suggestions.anniversary.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.anniversary.goodFacts.0',
      'suggestions.anniversary.goodFacts.1',

        'suggestions.anniversary.goodFacts.2',
      'suggestions.anniversary.goodFacts.3',

        'suggestions.anniversary.goodFacts.4',
    ],
    lessons: [
      'suggestions.anniversary.lessons.0',
      'suggestions.anniversary.lessons.1',

        'suggestions.anniversary.lessons.2',
      'suggestions.anniversary.lessons.3',

        'suggestions.anniversary.lessons.4',
    ],
  },

  // Breakup related

  breakup: {
    hardTruths: [
      'suggestions.breakup.hardTruths.0',
      'suggestions.breakup.hardTruths.1',

        'suggestions.breakup.hardTruths.2',
      'suggestions.breakup.hardTruths.3',

        'suggestions.breakup.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.breakup.goodFacts.0',
      'suggestions.breakup.goodFacts.1',

        'suggestions.breakup.goodFacts.2',
      'suggestions.breakup.goodFacts.3',

        'suggestions.breakup.goodFacts.4',
    ],
    lessons: [
      'suggestions.breakup.lessons.0',
      'suggestions.breakup.lessons.1',

        'suggestions.breakup.lessons.2',
      'suggestions.breakup.lessons.3',

        'suggestions.breakup.lessons.4',
    ],
  },

  // Wedding related

  wedding: {
    hardTruths: [
      'suggestions.wedding.hardTruths.0',
      'suggestions.wedding.hardTruths.1',

        'suggestions.wedding.hardTruths.2',
      'suggestions.wedding.hardTruths.3',

        'suggestions.wedding.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.wedding.goodFacts.0',
      'suggestions.wedding.goodFacts.1',

        'suggestions.wedding.goodFacts.2',
      'suggestions.wedding.goodFacts.3',

        'suggestions.wedding.goodFacts.4',
    ],
    lessons: [
      'suggestions.wedding.lessons.0',
      'suggestions.wedding.lessons.1',

        'suggestions.wedding.lessons.2',
      'suggestions.wedding.lessons.3',

        'suggestions.wedding.lessons.4',
    ],
  },

  // Holiday related

  holiday: {
    hardTruths: [
      'suggestions.holiday.hardTruths.0',
      'suggestions.holiday.hardTruths.1',

        'suggestions.holiday.hardTruths.2',
      'suggestions.holiday.hardTruths.3',

        'suggestions.holiday.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.holiday.goodFacts.0',
      'suggestions.holiday.goodFacts.1',

        'suggestions.holiday.goodFacts.2',
      'suggestions.holiday.goodFacts.3',

        'suggestions.holiday.goodFacts.4',
    ],
    lessons: [
      'suggestions.holiday.lessons.0',
      'suggestions.holiday.lessons.1',

        'suggestions.holiday.lessons.2',
      'suggestions.holiday.lessons.3',

        'suggestions.holiday.lessons.4',
    ],
  },

  // Christmas related

  christmas: {
    hardTruths: [
      'suggestions.christmas.hardTruths.0',
      'suggestions.christmas.hardTruths.1',

        'suggestions.christmas.hardTruths.2',
      'suggestions.christmas.hardTruths.3',

        'suggestions.christmas.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.christmas.goodFacts.0',
      'suggestions.christmas.goodFacts.1',

        'suggestions.christmas.goodFacts.2',
      'suggestions.christmas.goodFacts.3',

        'suggestions.christmas.goodFacts.4',
    ],
    lessons: [
      'suggestions.christmas.lessons.0',
      'suggestions.christmas.lessons.1',

        'suggestions.christmas.lessons.2',
      'suggestions.christmas.lessons.3',

        'suggestions.christmas.lessons.4',
    ],
  },

  // Vacation related

  vacation: {
    hardTruths: [
      'suggestions.vacation.hardTruths.0',
      'suggestions.vacation.hardTruths.1',

        'suggestions.vacation.hardTruths.2',
      'suggestions.vacation.hardTruths.3',

        'suggestions.vacation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.vacation.goodFacts.0',
      'suggestions.vacation.goodFacts.1',

        'suggestions.vacation.goodFacts.2',
      'suggestions.vacation.goodFacts.3',

        'suggestions.vacation.goodFacts.4',
    ],
    lessons: [
      'suggestions.vacation.lessons.0',
      'suggestions.vacation.lessons.1',

        'suggestions.vacation.lessons.2',
      'suggestions.vacation.lessons.3',

        'suggestions.vacation.lessons.4',
    ],
  },

  // Trip related

  trip: {
    hardTruths: [
      'suggestions.trip.hardTruths.0',
      'suggestions.trip.hardTruths.1',

        'suggestions.trip.hardTruths.2',
      'suggestions.trip.hardTruths.3',

        'suggestions.trip.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.trip.goodFacts.0',
      'suggestions.trip.goodFacts.1',

        'suggestions.trip.goodFacts.2',
      'suggestions.trip.goodFacts.3',

        'suggestions.trip.goodFacts.4',
    ],
    lessons: [
      'suggestions.trip.lessons.0',
      'suggestions.trip.lessons.1',

        'suggestions.trip.lessons.2',
      'suggestions.trip.lessons.3',

        'suggestions.trip.lessons.4',
    ],
  },

  // Walk related

  walk: {
    hardTruths: [
      'suggestions.walk.hardTruths.0',
      'suggestions.walk.hardTruths.1',

        'suggestions.walk.hardTruths.2',
      'suggestions.walk.hardTruths.3',

        'suggestions.walk.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.walk.goodFacts.0',
      'suggestions.walk.goodFacts.1',

        'suggestions.walk.goodFacts.2',
      'suggestions.walk.goodFacts.3',

        'suggestions.walk.goodFacts.4',
    ],
    lessons: [
      'suggestions.walk.lessons.0',
      'suggestions.walk.lessons.1',

        'suggestions.walk.lessons.2',
      'suggestions.walk.lessons.3',

        'suggestions.walk.lessons.4',
    ],
  },

  // Mountain related

  mountain: {
    hardTruths: [
      'suggestions.mountain.hardTruths.0',
      'suggestions.mountain.hardTruths.1',

        'suggestions.mountain.hardTruths.2',
      'suggestions.mountain.hardTruths.3',

        'suggestions.mountain.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.mountain.goodFacts.0',
      'suggestions.mountain.goodFacts.1',

        'suggestions.mountain.goodFacts.2',
      'suggestions.mountain.goodFacts.3',

        'suggestions.mountain.goodFacts.4',
    ],
    lessons: [
      'suggestions.mountain.lessons.0',
      'suggestions.mountain.lessons.1',

        'suggestions.mountain.lessons.2',
      'suggestions.mountain.lessons.3',

        'suggestions.mountain.lessons.4',
    ],
  },

  // Lake related

  lake: {
    hardTruths: [
      'suggestions.lake.hardTruths.0',
      'suggestions.lake.hardTruths.1',

        'suggestions.lake.hardTruths.2',
      'suggestions.lake.hardTruths.3',

        'suggestions.lake.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.lake.goodFacts.0',
      'suggestions.lake.goodFacts.1',

        'suggestions.lake.goodFacts.2',
      'suggestions.lake.goodFacts.3',

        'suggestions.lake.goodFacts.4',
    ],
    lessons: [
      'suggestions.lake.lessons.0',
      'suggestions.lake.lessons.1',

        'suggestions.lake.lessons.2',
      'suggestions.lake.lessons.3',

        'suggestions.lake.lessons.4',
    ],
  },

  // Sand related

  sand: {
    hardTruths: [
      'suggestions.sand.hardTruths.0',
      'suggestions.sand.hardTruths.1',

        'suggestions.sand.hardTruths.2',
      'suggestions.sand.hardTruths.3',

        'suggestions.sand.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.sand.goodFacts.0',
      'suggestions.sand.goodFacts.1',

        'suggestions.sand.goodFacts.2',
      'suggestions.sand.goodFacts.3',

        'suggestions.sand.goodFacts.4',
    ],
    lessons: [
      'suggestions.sand.lessons.0',
      'suggestions.sand.lessons.1',

        'suggestions.sand.lessons.2',
      'suggestions.sand.lessons.3',

        'suggestions.sand.lessons.4',
    ],
  },

  // Work related

  work: {
    hardTruths: [
      'suggestions.work.hardTruths.0',
      'suggestions.work.hardTruths.1',

        'suggestions.work.hardTruths.2',
      'suggestions.work.hardTruths.3',

        'suggestions.work.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.work.goodFacts.0',
      'suggestions.work.goodFacts.1',

        'suggestions.work.goodFacts.2',
      'suggestions.work.goodFacts.3',

        'suggestions.work.goodFacts.4',
    ],
    lessons: [
      'suggestions.work.lessons.0',
      'suggestions.work.lessons.1',

        'suggestions.work.lessons.2',
      'suggestions.work.lessons.3',

        'suggestions.work.lessons.4',
    ],
  },

  // Family related

  family: {
    hardTruths: [
      'suggestions.family.hardTruths.0',
      'suggestions.family.hardTruths.1',

        'suggestions.family.hardTruths.2',
      'suggestions.family.hardTruths.3',

        'suggestions.family.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.family.goodFacts.0',
      'suggestions.family.goodFacts.1',

        'suggestions.family.goodFacts.2',
      'suggestions.family.goodFacts.3',

        'suggestions.family.goodFacts.4',
    ],
    lessons: [
      'suggestions.family.lessons.0',
      'suggestions.family.lessons.1',

        'suggestions.family.lessons.2',
      'suggestions.family.lessons.3',

        'suggestions.family.lessons.4',
    ],
  },

  // Move related

  move: {
    hardTruths: [
      'suggestions.move.hardTruths.0',
      'suggestions.move.hardTruths.1',

        'suggestions.move.hardTruths.2',
      'suggestions.move.hardTruths.3',

        'suggestions.move.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.move.goodFacts.0',
      'suggestions.move.goodFacts.1',

        'suggestions.move.goodFacts.2',
      'suggestions.move.goodFacts.3',

        'suggestions.move.goodFacts.4',
    ],
    lessons: [
      'suggestions.move.lessons.0',
      'suggestions.move.lessons.1',

        'suggestions.move.lessons.2',
      'suggestions.move.lessons.3',

        'suggestions.move.lessons.4',
    ],
  },

  // Fight related

  fight: {
    hardTruths: [
      'suggestions.fight.hardTruths.0',
      'suggestions.fight.hardTruths.1',

        'suggestions.fight.hardTruths.2',
      'suggestions.fight.hardTruths.3',

        'suggestions.fight.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.fight.goodFacts.0',
      'suggestions.fight.goodFacts.1',

        'suggestions.fight.goodFacts.2',
      'suggestions.fight.goodFacts.3',

        'suggestions.fight.goodFacts.4',
    ],
    lessons: [
      'suggestions.fight.lessons.0',
      'suggestions.fight.lessons.1',

        'suggestions.fight.lessons.2',
      'suggestions.fight.lessons.3',

        'suggestions.fight.lessons.4',
    ],
  },

  // Trust related

  trust: {
    hardTruths: [
      'suggestions.trust.hardTruths.0',
      'suggestions.trust.hardTruths.1',

        'suggestions.trust.hardTruths.2',
      'suggestions.trust.hardTruths.3',

        'suggestions.trust.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.trust.goodFacts.0',
      'suggestions.trust.goodFacts.1',

        'suggestions.trust.goodFacts.2',
      'suggestions.trust.goodFacts.3',

        'suggestions.trust.goodFacts.4',
    ],
    lessons: [
      'suggestions.trust.lessons.0',
      'suggestions.trust.lessons.1',

        'suggestions.trust.lessons.2',
      'suggestions.trust.lessons.3',

        'suggestions.trust.lessons.4',
    ],
  },

  // Cheat related

  cheat: {
    hardTruths: [
      'suggestions.cheat.hardTruths.0',
      'suggestions.cheat.hardTruths.1',

        'suggestions.cheat.hardTruths.2',
      'suggestions.cheat.hardTruths.3',

        'suggestions.cheat.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.cheat.goodFacts.0',
      'suggestions.cheat.goodFacts.1',

        'suggestions.cheat.goodFacts.2',
      'suggestions.cheat.goodFacts.3',

        'suggestions.cheat.goodFacts.4',
    ],
    lessons: [
      'suggestions.cheat.lessons.0',
      'suggestions.cheat.lessons.1',

        'suggestions.cheat.lessons.2',
      'suggestions.cheat.lessons.3',

        'suggestions.cheat.lessons.4',
    ],
  },

  // Lie related

  lie: {
    hardTruths: [
      'suggestions.lie.hardTruths.0',
      'suggestions.lie.hardTruths.1',

        'suggestions.lie.hardTruths.2',
      'suggestions.lie.hardTruths.3',

        'suggestions.lie.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.lie.goodFacts.0',
      'suggestions.lie.goodFacts.1',

        'suggestions.lie.goodFacts.2',
      'suggestions.lie.goodFacts.3',

        'suggestions.lie.goodFacts.4',
    ],
    lessons: [
      'suggestions.lie.lessons.0',
      'suggestions.lie.lessons.1',

        'suggestions.lie.lessons.2',
      'suggestions.lie.lessons.3',

        'suggestions.lie.lessons.4',
    ],
  },

  // Friend related

  friend: {
    hardTruths: [
      'suggestions.friend.hardTruths.0',
      'suggestions.friend.hardTruths.1',

        'suggestions.friend.hardTruths.2',
      'suggestions.friend.hardTruths.3',

        'suggestions.friend.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.friend.goodFacts.0',
      'suggestions.friend.goodFacts.1',

        'suggestions.friend.goodFacts.2',
      'suggestions.friend.goodFacts.3',

        'suggestions.friend.goodFacts.4',
    ],
    lessons: [
      'suggestions.friend.lessons.0',
      'suggestions.friend.lessons.1',

        'suggestions.friend.lessons.2',
      'suggestions.friend.lessons.3',

        'suggestions.friend.lessons.4',
    ],
  },

  // Pet related

  pet: {
    hardTruths: [
      'suggestions.pet.hardTruths.0',
      'suggestions.pet.hardTruths.1',

        'suggestions.pet.hardTruths.2',
      'suggestions.pet.hardTruths.3',

        'suggestions.pet.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.pet.goodFacts.0',
      'suggestions.pet.goodFacts.1',

        'suggestions.pet.goodFacts.2',
      'suggestions.pet.goodFacts.3',

        'suggestions.pet.goodFacts.4',
    ],
    lessons: [
      'suggestions.pet.lessons.0',
      'suggestions.pet.lessons.1',

        'suggestions.pet.lessons.2',
      'suggestions.pet.lessons.3',

        'suggestions.pet.lessons.4',
    ],
  },

  // Home related

  home: {
    hardTruths: [
      'suggestions.home.hardTruths.0',
      'suggestions.home.hardTruths.1',

        'suggestions.home.hardTruths.2',
      'suggestions.home.hardTruths.3',

        'suggestions.home.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.home.goodFacts.0',
      'suggestions.home.goodFacts.1',

        'suggestions.home.goodFacts.2',
      'suggestions.home.goodFacts.3',

        'suggestions.home.goodFacts.4',
    ],
    lessons: [
      'suggestions.home.lessons.0',
      'suggestions.home.lessons.1',

        'suggestions.home.lessons.2',
      'suggestions.home.lessons.3',

        'suggestions.home.lessons.4',
    ],
  },

  // Money related

  money: {
    hardTruths: [
      'suggestions.money.hardTruths.0',
      'suggestions.money.hardTruths.1',

        'suggestions.money.hardTruths.2',
      'suggestions.money.hardTruths.3',

        'suggestions.money.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.money.goodFacts.0',
      'suggestions.money.goodFacts.1',

        'suggestions.money.goodFacts.2',
      'suggestions.money.goodFacts.3',

        'suggestions.money.goodFacts.4',
    ],
    lessons: [
      'suggestions.money.lessons.0',
      'suggestions.money.lessons.1',

        'suggestions.money.lessons.2',
      'suggestions.money.lessons.3',

        'suggestions.money.lessons.4',
    ],
  },

  // Apology related

  apology: {
    hardTruths: [
      'suggestions.apology.hardTruths.0',
      'suggestions.apology.hardTruths.1',

        'suggestions.apology.hardTruths.2',
      'suggestions.apology.hardTruths.3',

        'suggestions.apology.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.apology.goodFacts.0',
      'suggestions.apology.goodFacts.1',

        'suggestions.apology.goodFacts.2',
      'suggestions.apology.goodFacts.3',

        'suggestions.apology.goodFacts.4',
    ],
    lessons: [
      'suggestions.apology.lessons.0',
      'suggestions.apology.lessons.1',

        'suggestions.apology.lessons.2',
      'suggestions.apology.lessons.3',

        'suggestions.apology.lessons.4',
    ],
  },

  // Promise related

  promise: {
    hardTruths: [
      'suggestions.promise.hardTruths.0',
      'suggestions.promise.hardTruths.1',

        'suggestions.promise.hardTruths.2',
      'suggestions.promise.hardTruths.3',

        'suggestions.promise.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.promise.goodFacts.0',
      'suggestions.promise.goodFacts.1',

        'suggestions.promise.goodFacts.2',
      'suggestions.promise.goodFacts.3',

        'suggestions.promise.goodFacts.4',
    ],
    lessons: [
      'suggestions.promise.lessons.0',
      'suggestions.promise.lessons.1',

        'suggestions.promise.lessons.2',
      'suggestions.promise.lessons.3',

        'suggestions.promise.lessons.4',
    ],
  },

  // Graduation related

  graduation: {
    hardTruths: [
      'suggestions.graduation.hardTruths.0',
      'suggestions.graduation.hardTruths.1',

        'suggestions.graduation.hardTruths.2',
      'suggestions.graduation.hardTruths.3',

        'suggestions.graduation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.graduation.goodFacts.0',
      'suggestions.graduation.goodFacts.1',

        'suggestions.graduation.goodFacts.2',
      'suggestions.graduation.goodFacts.3',

        'suggestions.graduation.goodFacts.4',
    ],
    lessons: [
      'suggestions.graduation.lessons.0',
      'suggestions.graduation.lessons.1',

        'suggestions.graduation.lessons.2',
      'suggestions.graduation.lessons.3',

        'suggestions.graduation.lessons.4',
    ],
  },

  // Promotion related

  promotion: {
    hardTruths: [
      'suggestions.promotion.hardTruths.0',
      'suggestions.promotion.hardTruths.1',

        'suggestions.promotion.hardTruths.2',
      'suggestions.promotion.hardTruths.3',

        'suggestions.promotion.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.promotion.goodFacts.0',
      'suggestions.promotion.goodFacts.1',

        'suggestions.promotion.goodFacts.2',
      'suggestions.promotion.goodFacts.3',

        'suggestions.promotion.goodFacts.4',
    ],
    lessons: [
      'suggestions.promotion.lessons.0',
      'suggestions.promotion.lessons.1',

        'suggestions.promotion.lessons.2',
      'suggestions.promotion.lessons.3',

        'suggestions.promotion.lessons.4',
    ],
  },

  // Illness related

  illness: {
    hardTruths: [
      'suggestions.illness.hardTruths.0',
      'suggestions.illness.hardTruths.1',

        'suggestions.illness.hardTruths.2',
      'suggestions.illness.hardTruths.3',

        'suggestions.illness.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.illness.goodFacts.0',
      'suggestions.illness.goodFacts.1',

        'suggestions.illness.goodFacts.2',
      'suggestions.illness.goodFacts.3',

        'suggestions.illness.goodFacts.4',
    ],
    lessons: [
      'suggestions.illness.lessons.0',
      'suggestions.illness.lessons.1',

        'suggestions.illness.lessons.2',
      'suggestions.illness.lessons.3',

        'suggestions.illness.lessons.4',
    ],
  },

  // Hospital related

  hospital: {
    hardTruths: [
      'suggestions.hospital.hardTruths.0',
      'suggestions.hospital.hardTruths.1',

        'suggestions.hospital.hardTruths.2',
      'suggestions.hospital.hardTruths.3',

        'suggestions.hospital.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.hospital.goodFacts.0',
      'suggestions.hospital.goodFacts.1',

        'suggestions.hospital.goodFacts.2',
      'suggestions.hospital.goodFacts.3',

        'suggestions.hospital.goodFacts.4',
    ],
    lessons: [
      'suggestions.hospital.lessons.0',
      'suggestions.hospital.lessons.1',

        'suggestions.hospital.lessons.2',
      'suggestions.hospital.lessons.3',

        'suggestions.hospital.lessons.4',
    ],
  },

  // Concert related

  concert: {
    hardTruths: [
      'suggestions.concert.hardTruths.0',
      'suggestions.concert.hardTruths.1',

        'suggestions.concert.hardTruths.2',
      'suggestions.concert.hardTruths.3',

        'suggestions.concert.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.concert.goodFacts.0',
      'suggestions.concert.goodFacts.1',

        'suggestions.concert.goodFacts.2',
      'suggestions.concert.goodFacts.3',

        'suggestions.concert.goodFacts.4',
    ],
    lessons: [
      'suggestions.concert.lessons.0',
      'suggestions.concert.lessons.1',

        'suggestions.concert.lessons.2',
      'suggestions.concert.lessons.3',

        'suggestions.concert.lessons.4',
    ],
  },

  // Restaurant related

  restaurant: {
    hardTruths: [
      'suggestions.restaurant.hardTruths.0',
      'suggestions.restaurant.hardTruths.1',

        'suggestions.restaurant.hardTruths.2',
      'suggestions.restaurant.hardTruths.3',

        'suggestions.restaurant.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.restaurant.goodFacts.0',
      'suggestions.restaurant.goodFacts.1',

        'suggestions.restaurant.goodFacts.2',
      'suggestions.restaurant.goodFacts.3',

        'suggestions.restaurant.goodFacts.4',
    ],
    lessons: [
      'suggestions.restaurant.lessons.0',
      'suggestions.restaurant.lessons.1',

        'suggestions.restaurant.lessons.2',
      'suggestions.restaurant.lessons.3',

        'suggestions.restaurant.lessons.4',
    ],
  },

  // Date related

  date: {
    hardTruths: [
      'suggestions.date.hardTruths.0',
      'suggestions.date.hardTruths.1',

        'suggestions.date.hardTruths.2',
      'suggestions.date.hardTruths.3',

        'suggestions.date.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.date.goodFacts.0',
      'suggestions.date.goodFacts.1',

        'suggestions.date.goodFacts.2',
      'suggestions.date.goodFacts.3',

        'suggestions.date.goodFacts.4',
    ],
    lessons: [
      'suggestions.date.lessons.0',
      'suggestions.date.lessons.1',

        'suggestions.date.lessons.2',
      'suggestions.date.lessons.3',

        'suggestions.date.lessons.4',
    ],
  },

  // Gift related

  gift: {
    hardTruths: [
      'suggestions.gift.hardTruths.0',
      'suggestions.gift.hardTruths.1',

        'suggestions.gift.hardTruths.2',
      'suggestions.gift.hardTruths.3',

        'suggestions.gift.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.gift.goodFacts.0',
      'suggestions.gift.goodFacts.1',

        'suggestions.gift.goodFacts.2',
      'suggestions.gift.goodFacts.3',

        'suggestions.gift.goodFacts.4',
    ],
    lessons: [
      'suggestions.gift.lessons.0',
      'suggestions.gift.lessons.1',

        'suggestions.gift.lessons.2',
      'suggestions.gift.lessons.3',

        'suggestions.gift.lessons.4',
    ],
  },

  // Text related

  text: {
    hardTruths: [
      'suggestions.text.hardTruths.0',
      'suggestions.text.hardTruths.1',

        'suggestions.text.hardTruths.2',
      'suggestions.text.hardTruths.3',

        'suggestions.text.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.text.goodFacts.0',
      'suggestions.text.goodFacts.1',

        'suggestions.text.goodFacts.2',
      'suggestions.text.goodFacts.3',

        'suggestions.text.goodFacts.4',
    ],
    lessons: [
      'suggestions.text.lessons.0',
      'suggestions.text.lessons.1',

        'suggestions.text.lessons.2',
      'suggestions.text.lessons.3',

        'suggestions.text.lessons.4',
    ],
  },

  // Call related

  call: {
    hardTruths: [
      'suggestions.call.hardTruths.0',
      'suggestions.call.hardTruths.1',

        'suggestions.call.hardTruths.2',
      'suggestions.call.hardTruths.3',

        'suggestions.call.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.call.goodFacts.0',
      'suggestions.call.goodFacts.1',

        'suggestions.call.goodFacts.2',
      'suggestions.call.goodFacts.3',

        'suggestions.call.goodFacts.4',
    ],
    lessons: [
      'suggestions.call.lessons.0',
      'suggestions.call.lessons.1',

        'suggestions.call.lessons.2',
      'suggestions.call.lessons.3',

        'suggestions.call.lessons.4',
    ],
  },

  // Party related

  party: {
    hardTruths: [
      'suggestions.party.hardTruths.0',
      'suggestions.party.hardTruths.1',

        'suggestions.party.hardTruths.2',
      'suggestions.party.hardTruths.3',

        'suggestions.party.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.party.goodFacts.0',
      'suggestions.party.goodFacts.1',

        'suggestions.party.goodFacts.2',
      'suggestions.party.goodFacts.3',

        'suggestions.party.goodFacts.4',
    ],
    lessons: [
      'suggestions.party.lessons.0',
      'suggestions.party.lessons.1',

        'suggestions.party.lessons.2',
      'suggestions.party.lessons.3',

        'suggestions.party.lessons.4',
    ],
  },

  // Coffee related

  coffee: {
    hardTruths: [
      'suggestions.coffee.hardTruths.0',
      'suggestions.coffee.hardTruths.1',

        'suggestions.coffee.hardTruths.2',
      'suggestions.coffee.hardTruths.3',

        'suggestions.coffee.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.coffee.goodFacts.0',
      'suggestions.coffee.goodFacts.1',

        'suggestions.coffee.goodFacts.2',
      'suggestions.coffee.goodFacts.3',

        'suggestions.coffee.goodFacts.4',
    ],
    lessons: [
      'suggestions.coffee.lessons.0',
      'suggestions.coffee.lessons.1',

        'suggestions.coffee.lessons.2',
      'suggestions.coffee.lessons.3',

        'suggestions.coffee.lessons.4',
    ],
  },

  // School related

  school: {
    hardTruths: [
      'suggestions.school.hardTruths.0',
      'suggestions.school.hardTruths.1',

        'suggestions.school.hardTruths.2',
      'suggestions.school.hardTruths.3',

        'suggestions.school.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.school.goodFacts.0',
      'suggestions.school.goodFacts.1',

        'suggestions.school.goodFacts.2',
      'suggestions.school.goodFacts.3',

        'suggestions.school.goodFacts.4',
    ],
    lessons: [
      'suggestions.school.lessons.0',
      'suggestions.school.lessons.1',

        'suggestions.school.lessons.2',
      'suggestions.school.lessons.3',

        'suggestions.school.lessons.4',
    ],
  },

  // Gym related

  gym: {
    hardTruths: [
      'suggestions.gym.hardTruths.0',
      'suggestions.gym.hardTruths.1',

        'suggestions.gym.hardTruths.2',
      'suggestions.gym.hardTruths.3',

        'suggestions.gym.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.gym.goodFacts.0',
      'suggestions.gym.goodFacts.1',

        'suggestions.gym.goodFacts.2',
      'suggestions.gym.goodFacts.3',

        'suggestions.gym.goodFacts.4',
    ],
    lessons: [
      'suggestions.gym.lessons.0',
      'suggestions.gym.lessons.1',

        'suggestions.gym.lessons.2',
      'suggestions.gym.lessons.3',

        'suggestions.gym.lessons.4',
    ],
  },

  // Music related

  music: {
    hardTruths: [
      'suggestions.music.hardTruths.0',
      'suggestions.music.hardTruths.1',

        'suggestions.music.hardTruths.2',
      'suggestions.music.hardTruths.3',

        'suggestions.music.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.music.goodFacts.0',
      'suggestions.music.goodFacts.1',

        'suggestions.music.goodFacts.2',
      'suggestions.music.goodFacts.3',

        'suggestions.music.goodFacts.4',
    ],
    lessons: [
      'suggestions.music.lessons.0',
      'suggestions.music.lessons.1',

        'suggestions.music.lessons.2',
      'suggestions.music.lessons.3',

        'suggestions.music.lessons.4',
    ],
  },

  // Movie related

  movie: {
    hardTruths: [
      'suggestions.movie.hardTruths.0',
      'suggestions.movie.hardTruths.1',

        'suggestions.movie.hardTruths.2',
      'suggestions.movie.hardTruths.3',

        'suggestions.movie.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.movie.goodFacts.0',
      'suggestions.movie.goodFacts.1',

        'suggestions.movie.goodFacts.2',
      'suggestions.movie.goodFacts.3',

        'suggestions.movie.goodFacts.4',
    ],
    lessons: [
      'suggestions.movie.lessons.0',
      'suggestions.movie.lessons.1',

        'suggestions.movie.lessons.2',
      'suggestions.movie.lessons.3',

        'suggestions.movie.lessons.4',
    ],
  },

  // Photo related

  photo: {
    hardTruths: [
      'suggestions.photo.hardTruths.0',
      'suggestions.photo.hardTruths.1',

        'suggestions.photo.hardTruths.2',
      'suggestions.photo.hardTruths.3',

        'suggestions.photo.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.photo.goodFacts.0',
      'suggestions.photo.goodFacts.1',

        'suggestions.photo.goodFacts.2',
      'suggestions.photo.goodFacts.3',

        'suggestions.photo.goodFacts.4',
    ],
    lessons: [
      'suggestions.photo.lessons.0',
      'suggestions.photo.lessons.1',

        'suggestions.photo.lessons.2',
      'suggestions.photo.lessons.3',

        'suggestions.photo.lessons.4',
    ],
  },

  // Travel related

  travel: {
    hardTruths: [
      'suggestions.travel.hardTruths.0',
      'suggestions.travel.hardTruths.1',

        'suggestions.travel.hardTruths.2',
      'suggestions.travel.hardTruths.3',

        'suggestions.travel.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.travel.goodFacts.0',
      'suggestions.travel.goodFacts.1',

        'suggestions.travel.goodFacts.2',
      'suggestions.travel.goodFacts.3',

        'suggestions.travel.goodFacts.4',
    ],
    lessons: [
      'suggestions.travel.lessons.0',
      'suggestions.travel.lessons.1',

        'suggestions.travel.lessons.2',
      'suggestions.travel.lessons.3',

        'suggestions.travel.lessons.4',
    ],
  },

  // Airport related

  airport: {
    hardTruths: [
      'suggestions.airport.hardTruths.0',
      'suggestions.airport.hardTruths.1',

        'suggestions.airport.hardTruths.2',
      'suggestions.airport.hardTruths.3',

        'suggestions.airport.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.airport.goodFacts.0',
      'suggestions.airport.goodFacts.1',

        'suggestions.airport.goodFacts.2',
      'suggestions.airport.goodFacts.3',

        'suggestions.airport.goodFacts.4',
    ],
    lessons: [
      'suggestions.airport.lessons.0',
      'suggestions.airport.lessons.1',

        'suggestions.airport.lessons.2',
      'suggestions.airport.lessons.3',

        'suggestions.airport.lessons.4',
    ],
  },

  // Beach related

  beach: {
    hardTruths: [
      'suggestions.beach.hardTruths.0',
      'suggestions.beach.hardTruths.1',

        'suggestions.beach.hardTruths.2',
      'suggestions.beach.hardTruths.3',

        'suggestions.beach.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.beach.goodFacts.0',
      'suggestions.beach.goodFacts.1',

        'suggestions.beach.goodFacts.2',
      'suggestions.beach.goodFacts.3',

        'suggestions.beach.goodFacts.4',
    ],
    lessons: [
      'suggestions.beach.lessons.0',
      'suggestions.beach.lessons.1',

        'suggestions.beach.lessons.2',
      'suggestions.beach.lessons.3',

        'suggestions.beach.lessons.4',
    ],
  },

  // Park related

  park: {
    hardTruths: [
      'suggestions.park.hardTruths.0',
      'suggestions.park.hardTruths.1',

        'suggestions.park.hardTruths.2',
      'suggestions.park.hardTruths.3',

        'suggestions.park.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.park.goodFacts.0',
      'suggestions.park.goodFacts.1',

        'suggestions.park.goodFacts.2',
      'suggestions.park.goodFacts.3',

        'suggestions.park.goodFacts.4',
    ],
    lessons: [
      'suggestions.park.lessons.0',
      'suggestions.park.lessons.1',

        'suggestions.park.lessons.2',
      'suggestions.park.lessons.3',

        'suggestions.park.lessons.4',
    ],
  },

  // Shopping related

  shopping: {
    hardTruths: [
      'suggestions.shopping.hardTruths.0',
      'suggestions.shopping.hardTruths.1',

        'suggestions.shopping.hardTruths.2',
      'suggestions.shopping.hardTruths.3',

        'suggestions.shopping.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.shopping.goodFacts.0',
      'suggestions.shopping.goodFacts.1',

        'suggestions.shopping.goodFacts.2',
      'suggestions.shopping.goodFacts.3',

        'suggestions.shopping.goodFacts.4',
    ],
    lessons: [
      'suggestions.shopping.lessons.0',
      'suggestions.shopping.lessons.1',

        'suggestions.shopping.lessons.2',
      'suggestions.shopping.lessons.3',

        'suggestions.shopping.lessons.4',
    ],
  },

  // Car related

  car: {
    hardTruths: [
      'suggestions.car.hardTruths.0',
      'suggestions.car.hardTruths.1',

        'suggestions.car.hardTruths.2',
      'suggestions.car.hardTruths.3',

        'suggestions.car.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.car.goodFacts.0',
      'suggestions.car.goodFacts.1',

        'suggestions.car.goodFacts.2',
      'suggestions.car.goodFacts.3',

        'suggestions.car.goodFacts.4',
    ],
    lessons: [
      'suggestions.car.lessons.0',
      'suggestions.car.lessons.1',

        'suggestions.car.lessons.2',
      'suggestions.car.lessons.3',

        'suggestions.car.lessons.4',
    ],
  },

  // Game related

  game: {
    hardTruths: [
      'suggestions.game.hardTruths.0',
      'suggestions.game.hardTruths.1',

        'suggestions.game.hardTruths.2',
      'suggestions.game.hardTruths.3',

        'suggestions.game.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.game.goodFacts.0',
      'suggestions.game.goodFacts.1',

        'suggestions.game.goodFacts.2',
      'suggestions.game.goodFacts.3',

        'suggestions.game.goodFacts.4',
    ],
    lessons: [
      'suggestions.game.lessons.0',
      'suggestions.game.lessons.1',

        'suggestions.game.lessons.2',
      'suggestions.game.lessons.3',

        'suggestions.game.lessons.4',
    ],
  },

  // Generic/fallback suggestions
  default: {
    hardTruths: [
      'suggestions.default.hardTruths.0',
      'suggestions.default.hardTruths.1',
      'suggestions.default.hardTruths.2',
      'suggestions.default.hardTruths.3',
      'suggestions.default.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.default.goodFacts.0',
      'suggestions.default.goodFacts.1',
      'suggestions.default.goodFacts.2',
      'suggestions.default.goodFacts.3',
      'suggestions.default.goodFacts.4',
    ],
    lessons: [
      'suggestions.default.lessons.0',
      'suggestions.default.lessons.1',
      'suggestions.default.lessons.2',
      'suggestions.default.lessons.3',
      'suggestions.default.lessons.4',
    ],
  },
};

export function getSuggestionsForMemory(
  memoryTitle: string,
  language: Language = 'en'
): MomentSuggestions {
  const normalizedTitle = memoryTitle.toLowerCase();

  let matchedKeyword: string | null = null;
  for (const keyword in suggestionsByKeyword) {
    if (keyword !== 'default' && normalizedTitle.includes(keyword)) {
      matchedKeyword = keyword;
      break;
    }
  }

  const keyword = matchedKeyword || 'default';
  const suggestionKeys = suggestionsByKeyword[keyword];

  return {
    hardTruths: suggestionKeys.hardTruths.map(key => getTranslation(key as any, language)),
    goodFacts: suggestionKeys.goodFacts.map(key => getTranslation(key as any, language)),
    lessons: suggestionKeys.lessons.map(key => getTranslation(key as any, language)),
  };
}

/**
 * Get a random hard truth suggestion based on memory title
 * @param memoryTitle - The title of the memory
 * @param language - 'en' or 'bg'
 * @returns A random hard truth suggestion
 */
export function getHardTruthSuggestion(memoryTitle: string, language: Language = 'en'): string {
  const suggestions = getSuggestionsForMemory(memoryTitle, language);
  const randomIndex = Math.floor(Math.random() * suggestions.hardTruths.length);
  return suggestions.hardTruths[randomIndex];
}

/**
 * Get a random good fact suggestion based on memory title
 * @param memoryTitle - The title of the memory
 * @param language - 'en' or 'bg'
 * @returns A random good fact suggestion
 */
export function getGoodFactSuggestion(memoryTitle: string, language: Language = 'en'): string {
  const suggestions = getSuggestionsForMemory(memoryTitle, language);
  const randomIndex = Math.floor(Math.random() * suggestions.goodFacts.length);
  return suggestions.goodFacts[randomIndex];
}

/**
 * Get a random lesson suggestion based on memory title
 * @param memoryTitle - The title of the memory
 * @param language - 'en' or 'bg'
 * @returns A random lesson suggestion
 */
export function getLessonSuggestion(memoryTitle: string, language: Language = 'en'): string {
  const suggestions = getSuggestionsForMemory(memoryTitle, language);
  const randomIndex = Math.floor(Math.random() * suggestions.lessons.length);
  return suggestions.lessons[randomIndex];
}
