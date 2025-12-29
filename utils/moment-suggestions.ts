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

  // Friends and social connections
  friends: {
    hardTruths: [
      'suggestions.friends.hardTruths.0',
      'suggestions.friends.hardTruths.1',
      'suggestions.friends.hardTruths.2',
      'suggestions.friends.hardTruths.3',
      'suggestions.friends.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.friends.goodFacts.0',
      'suggestions.friends.goodFacts.1',
      'suggestions.friends.goodFacts.2',
      'suggestions.friends.goodFacts.3',
      'suggestions.friends.goodFacts.4',
    ],
    lessons: [
      'suggestions.friends.lessons.0',
      'suggestions.friends.lessons.1',
      'suggestions.friends.lessons.2',
      'suggestions.friends.lessons.3',
      'suggestions.friends.lessons.4',
    ],
  },

  // Daily life activities
  shower: {
    hardTruths: [
      'suggestions.shower.hardTruths.0',
      'suggestions.shower.hardTruths.1',
      'suggestions.shower.hardTruths.2',
      'suggestions.shower.hardTruths.3',
      'suggestions.shower.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.shower.goodFacts.0',
      'suggestions.shower.goodFacts.1',
      'suggestions.shower.goodFacts.2',
      'suggestions.shower.goodFacts.3',
      'suggestions.shower.goodFacts.4',
    ],
    lessons: [
      'suggestions.shower.lessons.0',
      'suggestions.shower.lessons.1',
      'suggestions.shower.lessons.2',
      'suggestions.shower.lessons.3',
      'suggestions.shower.lessons.4',
    ],
  },

  bed: {
    hardTruths: [
      'suggestions.bed.hardTruths.0',
      'suggestions.bed.hardTruths.1',
      'suggestions.bed.hardTruths.2',
      'suggestions.bed.hardTruths.3',
      'suggestions.bed.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.bed.goodFacts.0',
      'suggestions.bed.goodFacts.1',
      'suggestions.bed.goodFacts.2',
      'suggestions.bed.goodFacts.3',
      'suggestions.bed.goodFacts.4',
    ],
    lessons: [
      'suggestions.bed.lessons.0',
      'suggestions.bed.lessons.1',
      'suggestions.bed.lessons.2',
      'suggestions.bed.lessons.3',
      'suggestions.bed.lessons.4',
    ],
  },

  sleep: {
    hardTruths: [
      'suggestions.sleep.hardTruths.0',
      'suggestions.sleep.hardTruths.1',
      'suggestions.sleep.hardTruths.2',
      'suggestions.sleep.hardTruths.3',
      'suggestions.sleep.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.sleep.goodFacts.0',
      'suggestions.sleep.goodFacts.1',
      'suggestions.sleep.goodFacts.2',
      'suggestions.sleep.goodFacts.3',
      'suggestions.sleep.goodFacts.4',
    ],
    lessons: [
      'suggestions.sleep.lessons.0',
      'suggestions.sleep.lessons.1',
      'suggestions.sleep.lessons.2',
      'suggestions.sleep.lessons.3',
      'suggestions.sleep.lessons.4',
    ],
  },

  grocery: {
    hardTruths: [
      'suggestions.grocery.hardTruths.0',
      'suggestions.grocery.hardTruths.1',
      'suggestions.grocery.hardTruths.2',
      'suggestions.grocery.hardTruths.3',
      'suggestions.grocery.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.grocery.goodFacts.0',
      'suggestions.grocery.goodFacts.1',
      'suggestions.grocery.goodFacts.2',
      'suggestions.grocery.goodFacts.3',
      'suggestions.grocery.goodFacts.4',
    ],
    lessons: [
      'suggestions.grocery.lessons.0',
      'suggestions.grocery.lessons.1',
      'suggestions.grocery.lessons.2',
      'suggestions.grocery.lessons.3',
      'suggestions.grocery.lessons.4',
    ],
  },

  laundry: {
    hardTruths: [
      'suggestions.laundry.hardTruths.0',
      'suggestions.laundry.hardTruths.1',
      'suggestions.laundry.hardTruths.2',
      'suggestions.laundry.hardTruths.3',
      'suggestions.laundry.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.laundry.goodFacts.0',
      'suggestions.laundry.goodFacts.1',
      'suggestions.laundry.goodFacts.2',
      'suggestions.laundry.goodFacts.3',
      'suggestions.laundry.goodFacts.4',
    ],
    lessons: [
      'suggestions.laundry.lessons.0',
      'suggestions.laundry.lessons.1',
      'suggestions.laundry.lessons.2',
      'suggestions.laundry.lessons.3',
      'suggestions.laundry.lessons.4',
    ],
  },

  drive: {
    hardTruths: [
      'suggestions.drive.hardTruths.0',
      'suggestions.drive.hardTruths.1',
      'suggestions.drive.hardTruths.2',
      'suggestions.drive.hardTruths.3',
      'suggestions.drive.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.drive.goodFacts.0',
      'suggestions.drive.goodFacts.1',
      'suggestions.drive.goodFacts.2',
      'suggestions.drive.goodFacts.3',
      'suggestions.drive.goodFacts.4',
    ],
    lessons: [
      'suggestions.drive.lessons.0',
      'suggestions.drive.lessons.1',
      'suggestions.drive.lessons.2',
      'suggestions.drive.lessons.3',
      'suggestions.drive.lessons.4',
    ],
  },

  commute: {
    hardTruths: [
      'suggestions.commute.hardTruths.0',
      'suggestions.commute.hardTruths.1',
      'suggestions.commute.hardTruths.2',
      'suggestions.commute.hardTruths.3',
      'suggestions.commute.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.commute.goodFacts.0',
      'suggestions.commute.goodFacts.1',
      'suggestions.commute.goodFacts.2',
      'suggestions.commute.goodFacts.3',
      'suggestions.commute.goodFacts.4',
    ],
    lessons: [
      'suggestions.commute.lessons.0',
      'suggestions.commute.lessons.1',
      'suggestions.commute.lessons.2',
      'suggestions.commute.lessons.3',
      'suggestions.commute.lessons.4',
    ],
  },

  exercise: {
    hardTruths: [
      'suggestions.exercise.hardTruths.0',
      'suggestions.exercise.hardTruths.1',
      'suggestions.exercise.hardTruths.2',
      'suggestions.exercise.hardTruths.3',
      'suggestions.exercise.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.exercise.goodFacts.0',
      'suggestions.exercise.goodFacts.1',
      'suggestions.exercise.goodFacts.2',
      'suggestions.exercise.goodFacts.3',
      'suggestions.exercise.goodFacts.4',
    ],
    lessons: [
      'suggestions.exercise.lessons.0',
      'suggestions.exercise.lessons.1',
      'suggestions.exercise.lessons.2',
      'suggestions.exercise.lessons.3',
      'suggestions.exercise.lessons.4',
    ],
  },

  workout: {
    hardTruths: [
      'suggestions.workout.hardTruths.0',
      'suggestions.workout.hardTruths.1',
      'suggestions.workout.hardTruths.2',
      'suggestions.workout.hardTruths.3',
      'suggestions.workout.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.workout.goodFacts.0',
      'suggestions.workout.goodFacts.1',
      'suggestions.workout.goodFacts.2',
      'suggestions.workout.goodFacts.3',
      'suggestions.workout.goodFacts.4',
    ],
    lessons: [
      'suggestions.workout.lessons.0',
      'suggestions.workout.lessons.1',
      'suggestions.workout.lessons.2',
      'suggestions.workout.lessons.3',
      'suggestions.workout.lessons.4',
    ],
  },

  study: {
    hardTruths: [
      'suggestions.study.hardTruths.0',
      'suggestions.study.hardTruths.1',
      'suggestions.study.hardTruths.2',
      'suggestions.study.hardTruths.3',
      'suggestions.study.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.study.goodFacts.0',
      'suggestions.study.goodFacts.1',
      'suggestions.study.goodFacts.2',
      'suggestions.study.goodFacts.3',
      'suggestions.study.goodFacts.4',
    ],
    lessons: [
      'suggestions.study.lessons.0',
      'suggestions.study.lessons.1',
      'suggestions.study.lessons.2',
      'suggestions.study.lessons.3',
      'suggestions.study.lessons.4',
    ],
  },

  lunch: {
    hardTruths: [
      'suggestions.lunch.hardTruths.0',
      'suggestions.lunch.hardTruths.1',
      'suggestions.lunch.hardTruths.2',
      'suggestions.lunch.hardTruths.3',
      'suggestions.lunch.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.lunch.goodFacts.0',
      'suggestions.lunch.goodFacts.1',
      'suggestions.lunch.goodFacts.2',
      'suggestions.lunch.goodFacts.3',
      'suggestions.lunch.goodFacts.4',
    ],
    lessons: [
      'suggestions.lunch.lessons.0',
      'suggestions.lunch.lessons.1',
      'suggestions.lunch.lessons.2',
      'suggestions.lunch.lessons.3',
      'suggestions.lunch.lessons.4',
    ],
  },

  snack: {
    hardTruths: [
      'suggestions.snack.hardTruths.0',
      'suggestions.snack.hardTruths.1',
      'suggestions.snack.hardTruths.2',
      'suggestions.snack.hardTruths.3',
      'suggestions.snack.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.snack.goodFacts.0',
      'suggestions.snack.goodFacts.1',
      'suggestions.snack.goodFacts.2',
      'suggestions.snack.goodFacts.3',
      'suggestions.snack.goodFacts.4',
    ],
    lessons: [
      'suggestions.snack.lessons.0',
      'suggestions.snack.lessons.1',
      'suggestions.snack.lessons.2',
      'suggestions.snack.lessons.3',
      'suggestions.snack.lessons.4',
    ],
  },

  tea: {
    hardTruths: [
      'suggestions.tea.hardTruths.0',
      'suggestions.tea.hardTruths.1',
      'suggestions.tea.hardTruths.2',
      'suggestions.tea.hardTruths.3',
      'suggestions.tea.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.tea.goodFacts.0',
      'suggestions.tea.goodFacts.1',
      'suggestions.tea.goodFacts.2',
      'suggestions.tea.goodFacts.3',
      'suggestions.tea.goodFacts.4',
    ],
    lessons: [
      'suggestions.tea.lessons.0',
      'suggestions.tea.lessons.1',
      'suggestions.tea.lessons.2',
      'suggestions.tea.lessons.3',
      'suggestions.tea.lessons.4',
    ],
  },

  // Reunion and gatherings
  reunion: {
    hardTruths: [
      'suggestions.reunion.hardTruths.0',
      'suggestions.reunion.hardTruths.1',
      'suggestions.reunion.hardTruths.2',
      'suggestions.reunion.hardTruths.3',
      'suggestions.reunion.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.reunion.goodFacts.0',
      'suggestions.reunion.goodFacts.1',
      'suggestions.reunion.goodFacts.2',
      'suggestions.reunion.goodFacts.3',
      'suggestions.reunion.goodFacts.4',
    ],
    lessons: [
      'suggestions.reunion.lessons.0',
      'suggestions.reunion.lessons.1',
      'suggestions.reunion.lessons.2',
      'suggestions.reunion.lessons.3',
      'suggestions.reunion.lessons.4',
    ],
  },

  // More daily life activities
  cleaning: {
    hardTruths: [
      'suggestions.cleaning.hardTruths.0',
      'suggestions.cleaning.hardTruths.1',
      'suggestions.cleaning.hardTruths.2',
      'suggestions.cleaning.hardTruths.3',
      'suggestions.cleaning.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.cleaning.goodFacts.0',
      'suggestions.cleaning.goodFacts.1',
      'suggestions.cleaning.goodFacts.2',
      'suggestions.cleaning.goodFacts.3',
      'suggestions.cleaning.goodFacts.4',
    ],
    lessons: [
      'suggestions.cleaning.lessons.0',
      'suggestions.cleaning.lessons.1',
      'suggestions.cleaning.lessons.2',
      'suggestions.cleaning.lessons.3',
      'suggestions.cleaning.lessons.4',
    ],
  },

  dishes: {
    hardTruths: [
      'suggestions.dishes.hardTruths.0',
      'suggestions.dishes.hardTruths.1',
      'suggestions.dishes.hardTruths.2',
      'suggestions.dishes.hardTruths.3',
      'suggestions.dishes.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.dishes.goodFacts.0',
      'suggestions.dishes.goodFacts.1',
      'suggestions.dishes.goodFacts.2',
      'suggestions.dishes.goodFacts.3',
      'suggestions.dishes.goodFacts.4',
    ],
    lessons: [
      'suggestions.dishes.lessons.0',
      'suggestions.dishes.lessons.1',
      'suggestions.dishes.lessons.2',
      'suggestions.dishes.lessons.3',
      'suggestions.dishes.lessons.4',
    ],
  },

  errands: {
    hardTruths: [
      'suggestions.errands.hardTruths.0',
      'suggestions.errands.hardTruths.1',
      'suggestions.errands.hardTruths.2',
      'suggestions.errands.hardTruths.3',
      'suggestions.errands.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.errands.goodFacts.0',
      'suggestions.errands.goodFacts.1',
      'suggestions.errands.goodFacts.2',
      'suggestions.errands.goodFacts.3',
      'suggestions.errands.goodFacts.4',
    ],
    lessons: [
      'suggestions.errands.lessons.0',
      'suggestions.errands.lessons.1',
      'suggestions.errands.lessons.2',
      'suggestions.errands.lessons.3',
      'suggestions.errands.lessons.4',
    ],
  },

  chores: {
    hardTruths: [
      'suggestions.chores.hardTruths.0',
      'suggestions.chores.hardTruths.1',
      'suggestions.chores.hardTruths.2',
      'suggestions.chores.hardTruths.3',
      'suggestions.chores.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.chores.goodFacts.0',
      'suggestions.chores.goodFacts.1',
      'suggestions.chores.goodFacts.2',
      'suggestions.chores.goodFacts.3',
      'suggestions.chores.goodFacts.4',
    ],
    lessons: [
      'suggestions.chores.lessons.0',
      'suggestions.chores.lessons.1',
      'suggestions.chores.lessons.2',
      'suggestions.chores.lessons.3',
      'suggestions.chores.lessons.4',
    ],
  },

  neighborhood: {
    hardTruths: [
      'suggestions.neighborhood.hardTruths.0',
      'suggestions.neighborhood.hardTruths.1',
      'suggestions.neighborhood.hardTruths.2',
      'suggestions.neighborhood.hardTruths.3',
      'suggestions.neighborhood.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.neighborhood.goodFacts.0',
      'suggestions.neighborhood.goodFacts.1',
      'suggestions.neighborhood.goodFacts.2',
      'suggestions.neighborhood.goodFacts.3',
      'suggestions.neighborhood.goodFacts.4',
    ],
    lessons: [
      'suggestions.neighborhood.lessons.0',
      'suggestions.neighborhood.lessons.1',
      'suggestions.neighborhood.lessons.2',
      'suggestions.neighborhood.lessons.3',
      'suggestions.neighborhood.lessons.4',
    ],
  },

  street: {
    hardTruths: [
      'suggestions.street.hardTruths.0',
      'suggestions.street.hardTruths.1',
      'suggestions.street.hardTruths.2',
      'suggestions.street.hardTruths.3',
      'suggestions.street.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.street.goodFacts.0',
      'suggestions.street.goodFacts.1',
      'suggestions.street.goodFacts.2',
      'suggestions.street.goodFacts.3',
      'suggestions.street.goodFacts.4',
    ],
    lessons: [
      'suggestions.street.lessons.0',
      'suggestions.street.lessons.1',
      'suggestions.street.lessons.2',
      'suggestions.street.lessons.3',
      'suggestions.street.lessons.4',
    ],
  },

  store: {
    hardTruths: [
      'suggestions.store.hardTruths.0',
      'suggestions.store.hardTruths.1',
      'suggestions.store.hardTruths.2',
      'suggestions.store.hardTruths.3',
      'suggestions.store.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.store.goodFacts.0',
      'suggestions.store.goodFacts.1',
      'suggestions.store.goodFacts.2',
      'suggestions.store.goodFacts.3',
      'suggestions.store.goodFacts.4',
    ],
    lessons: [
      'suggestions.store.lessons.0',
      'suggestions.store.lessons.1',
      'suggestions.store.lessons.2',
      'suggestions.store.lessons.3',
      'suggestions.store.lessons.4',
    ],
  },

  bank: {
    hardTruths: [
      'suggestions.bank.hardTruths.0',
      'suggestions.bank.hardTruths.1',
      'suggestions.bank.hardTruths.2',
      'suggestions.bank.hardTruths.3',
      'suggestions.bank.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.bank.goodFacts.0',
      'suggestions.bank.goodFacts.1',
      'suggestions.bank.goodFacts.2',
      'suggestions.bank.goodFacts.3',
      'suggestions.bank.goodFacts.4',
    ],
    lessons: [
      'suggestions.bank.lessons.0',
      'suggestions.bank.lessons.1',
      'suggestions.bank.lessons.2',
      'suggestions.bank.lessons.3',
      'suggestions.bank.lessons.4',
    ],
  },

  pharmacy: {
    hardTruths: [
      'suggestions.pharmacy.hardTruths.0',
      'suggestions.pharmacy.hardTruths.1',
      'suggestions.pharmacy.hardTruths.2',
      'suggestions.pharmacy.hardTruths.3',
      'suggestions.pharmacy.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.pharmacy.goodFacts.0',
      'suggestions.pharmacy.goodFacts.1',
      'suggestions.pharmacy.goodFacts.2',
      'suggestions.pharmacy.goodFacts.3',
      'suggestions.pharmacy.goodFacts.4',
    ],
    lessons: [
      'suggestions.pharmacy.lessons.0',
      'suggestions.pharmacy.lessons.1',
      'suggestions.pharmacy.lessons.2',
      'suggestions.pharmacy.lessons.3',
      'suggestions.pharmacy.lessons.4',
    ],
  },

  doctor: {
    hardTruths: [
      'suggestions.doctor.hardTruths.0',
      'suggestions.doctor.hardTruths.1',
      'suggestions.doctor.hardTruths.2',
      'suggestions.doctor.hardTruths.3',
      'suggestions.doctor.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.doctor.goodFacts.0',
      'suggestions.doctor.goodFacts.1',
      'suggestions.doctor.goodFacts.2',
      'suggestions.doctor.goodFacts.3',
      'suggestions.doctor.goodFacts.4',
    ],
    lessons: [
      'suggestions.doctor.lessons.0',
      'suggestions.doctor.lessons.1',
      'suggestions.doctor.lessons.2',
      'suggestions.doctor.lessons.3',
      'suggestions.doctor.lessons.4',
    ],
  },

  appointment: {
    hardTruths: [
      'suggestions.appointment.hardTruths.0',
      'suggestions.appointment.hardTruths.1',
      'suggestions.appointment.hardTruths.2',
      'suggestions.appointment.hardTruths.3',
      'suggestions.appointment.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.appointment.goodFacts.0',
      'suggestions.appointment.goodFacts.1',
      'suggestions.appointment.goodFacts.2',
      'suggestions.appointment.goodFacts.3',
      'suggestions.appointment.goodFacts.4',
    ],
    lessons: [
      'suggestions.appointment.lessons.0',
      'suggestions.appointment.lessons.1',
      'suggestions.appointment.lessons.2',
      'suggestions.appointment.lessons.3',
      'suggestions.appointment.lessons.4',
    ],
  },

  // More daily life - meals and routines
  breakfast: {
    hardTruths: [
      'suggestions.breakfast.hardTruths.0',
      'suggestions.breakfast.hardTruths.1',
      'suggestions.breakfast.hardTruths.2',
      'suggestions.breakfast.hardTruths.3',
      'suggestions.breakfast.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.breakfast.goodFacts.0',
      'suggestions.breakfast.goodFacts.1',
      'suggestions.breakfast.goodFacts.2',
      'suggestions.breakfast.goodFacts.3',
      'suggestions.breakfast.goodFacts.4',
    ],
    lessons: [
      'suggestions.breakfast.lessons.0',
      'suggestions.breakfast.lessons.1',
      'suggestions.breakfast.lessons.2',
      'suggestions.breakfast.lessons.3',
      'suggestions.breakfast.lessons.4',
    ],
  },

  dinner: {
    hardTruths: [
      'suggestions.dinner.hardTruths.0',
      'suggestions.dinner.hardTruths.1',
      'suggestions.dinner.hardTruths.2',
      'suggestions.dinner.hardTruths.3',
      'suggestions.dinner.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.dinner.goodFacts.0',
      'suggestions.dinner.goodFacts.1',
      'suggestions.dinner.goodFacts.2',
      'suggestions.dinner.goodFacts.3',
      'suggestions.dinner.goodFacts.4',
    ],
    lessons: [
      'suggestions.dinner.lessons.0',
      'suggestions.dinner.lessons.1',
      'suggestions.dinner.lessons.2',
      'suggestions.dinner.lessons.3',
      'suggestions.dinner.lessons.4',
    ],
  },

  cooking: {
    hardTruths: [
      'suggestions.cooking.hardTruths.0',
      'suggestions.cooking.hardTruths.1',
      'suggestions.cooking.hardTruths.2',
      'suggestions.cooking.hardTruths.3',
      'suggestions.cooking.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.cooking.goodFacts.0',
      'suggestions.cooking.goodFacts.1',
      'suggestions.cooking.goodFacts.2',
      'suggestions.cooking.goodFacts.3',
      'suggestions.cooking.goodFacts.4',
    ],
    lessons: [
      'suggestions.cooking.lessons.0',
      'suggestions.cooking.lessons.1',
      'suggestions.cooking.lessons.2',
      'suggestions.cooking.lessons.3',
      'suggestions.cooking.lessons.4',
    ],
  },

  morning: {
    hardTruths: [
      'suggestions.morning.hardTruths.0',
      'suggestions.morning.hardTruths.1',
      'suggestions.morning.hardTruths.2',
      'suggestions.morning.hardTruths.3',
      'suggestions.morning.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.morning.goodFacts.0',
      'suggestions.morning.goodFacts.1',
      'suggestions.morning.goodFacts.2',
      'suggestions.morning.goodFacts.3',
      'suggestions.morning.goodFacts.4',
    ],
    lessons: [
      'suggestions.morning.lessons.0',
      'suggestions.morning.lessons.1',
      'suggestions.morning.lessons.2',
      'suggestions.morning.lessons.3',
      'suggestions.morning.lessons.4',
    ],
  },

  evening: {
    hardTruths: [
      'suggestions.evening.hardTruths.0',
      'suggestions.evening.hardTruths.1',
      'suggestions.evening.hardTruths.2',
      'suggestions.evening.hardTruths.3',
      'suggestions.evening.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.evening.goodFacts.0',
      'suggestions.evening.goodFacts.1',
      'suggestions.evening.goodFacts.2',
      'suggestions.evening.goodFacts.3',
      'suggestions.evening.goodFacts.4',
    ],
    lessons: [
      'suggestions.evening.lessons.0',
      'suggestions.evening.lessons.1',
      'suggestions.evening.lessons.2',
      'suggestions.evening.lessons.3',
      'suggestions.evening.lessons.4',
    ],
  },

  night: {
    hardTruths: [
      'suggestions.night.hardTruths.0',
      'suggestions.night.hardTruths.1',
      'suggestions.night.hardTruths.2',
      'suggestions.night.hardTruths.3',
      'suggestions.night.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.night.goodFacts.0',
      'suggestions.night.goodFacts.1',
      'suggestions.night.goodFacts.2',
      'suggestions.night.goodFacts.3',
      'suggestions.night.goodFacts.4',
    ],
    lessons: [
      'suggestions.night.lessons.0',
      'suggestions.night.lessons.1',
      'suggestions.night.lessons.2',
      'suggestions.night.lessons.3',
      'suggestions.night.lessons.4',
    ],
  },

  // Places and spaces
  kitchen: {
    hardTruths: [
      'suggestions.kitchen.hardTruths.0',
      'suggestions.kitchen.hardTruths.1',
      'suggestions.kitchen.hardTruths.2',
      'suggestions.kitchen.hardTruths.3',
      'suggestions.kitchen.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.kitchen.goodFacts.0',
      'suggestions.kitchen.goodFacts.1',
      'suggestions.kitchen.goodFacts.2',
      'suggestions.kitchen.goodFacts.3',
      'suggestions.kitchen.goodFacts.4',
    ],
    lessons: [
      'suggestions.kitchen.lessons.0',
      'suggestions.kitchen.lessons.1',
      'suggestions.kitchen.lessons.2',
      'suggestions.kitchen.lessons.3',
      'suggestions.kitchen.lessons.4',
    ],
  },

  bathroom: {
    hardTruths: [
      'suggestions.bathroom.hardTruths.0',
      'suggestions.bathroom.hardTruths.1',
      'suggestions.bathroom.hardTruths.2',
      'suggestions.bathroom.hardTruths.3',
      'suggestions.bathroom.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.bathroom.goodFacts.0',
      'suggestions.bathroom.goodFacts.1',
      'suggestions.bathroom.goodFacts.2',
      'suggestions.bathroom.goodFacts.3',
      'suggestions.bathroom.goodFacts.4',
    ],
    lessons: [
      'suggestions.bathroom.lessons.0',
      'suggestions.bathroom.lessons.1',
      'suggestions.bathroom.lessons.2',
      'suggestions.bathroom.lessons.3',
      'suggestions.bathroom.lessons.4',
    ],
  },

  office: {
    hardTruths: [
      'suggestions.office.hardTruths.0',
      'suggestions.office.hardTruths.1',
      'suggestions.office.hardTruths.2',
      'suggestions.office.hardTruths.3',
      'suggestions.office.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.office.goodFacts.0',
      'suggestions.office.goodFacts.1',
      'suggestions.office.goodFacts.2',
      'suggestions.office.goodFacts.3',
      'suggestions.office.goodFacts.4',
    ],
    lessons: [
      'suggestions.office.lessons.0',
      'suggestions.office.lessons.1',
      'suggestions.office.lessons.2',
      'suggestions.office.lessons.3',
      'suggestions.office.lessons.4',
    ],
  },

  library: {
    hardTruths: [
      'suggestions.library.hardTruths.0',
      'suggestions.library.hardTruths.1',
      'suggestions.library.hardTruths.2',
      'suggestions.library.hardTruths.3',
      'suggestions.library.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.library.goodFacts.0',
      'suggestions.library.goodFacts.1',
      'suggestions.library.goodFacts.2',
      'suggestions.library.goodFacts.3',
      'suggestions.library.goodFacts.4',
    ],
    lessons: [
      'suggestions.library.lessons.0',
      'suggestions.library.lessons.1',
      'suggestions.library.lessons.2',
      'suggestions.library.lessons.3',
      'suggestions.library.lessons.4',
    ],
  },

  cafe: {
    hardTruths: [
      'suggestions.cafe.hardTruths.0',
      'suggestions.cafe.hardTruths.1',
      'suggestions.cafe.hardTruths.2',
      'suggestions.cafe.hardTruths.3',
      'suggestions.cafe.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.cafe.goodFacts.0',
      'suggestions.cafe.goodFacts.1',
      'suggestions.cafe.goodFacts.2',
      'suggestions.cafe.goodFacts.3',
      'suggestions.cafe.goodFacts.4',
    ],
    lessons: [
      'suggestions.cafe.lessons.0',
      'suggestions.cafe.lessons.1',
      'suggestions.cafe.lessons.2',
      'suggestions.cafe.lessons.3',
      'suggestions.cafe.lessons.4',
    ],
  },

  // More activities
  reading: {
    hardTruths: [
      'suggestions.reading.hardTruths.0',
      'suggestions.reading.hardTruths.1',
      'suggestions.reading.hardTruths.2',
      'suggestions.reading.hardTruths.3',
      'suggestions.reading.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.reading.goodFacts.0',
      'suggestions.reading.goodFacts.1',
      'suggestions.reading.goodFacts.2',
      'suggestions.reading.goodFacts.3',
      'suggestions.reading.goodFacts.4',
    ],
    lessons: [
      'suggestions.reading.lessons.0',
      'suggestions.reading.lessons.1',
      'suggestions.reading.lessons.2',
      'suggestions.reading.lessons.3',
      'suggestions.reading.lessons.4',
    ],
  },

  watching: {
    hardTruths: [
      'suggestions.watching.hardTruths.0',
      'suggestions.watching.hardTruths.1',
      'suggestions.watching.hardTruths.2',
      'suggestions.watching.hardTruths.3',
      'suggestions.watching.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.watching.goodFacts.0',
      'suggestions.watching.goodFacts.1',
      'suggestions.watching.goodFacts.2',
      'suggestions.watching.goodFacts.3',
      'suggestions.watching.goodFacts.4',
    ],
    lessons: [
      'suggestions.watching.lessons.0',
      'suggestions.watching.lessons.1',
      'suggestions.watching.lessons.2',
      'suggestions.watching.lessons.3',
      'suggestions.watching.lessons.4',
    ],
  },

  listening: {
    hardTruths: [
      'suggestions.listening.hardTruths.0',
      'suggestions.listening.hardTruths.1',
      'suggestions.listening.hardTruths.2',
      'suggestions.listening.hardTruths.3',
      'suggestions.listening.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.listening.goodFacts.0',
      'suggestions.listening.goodFacts.1',
      'suggestions.listening.goodFacts.2',
      'suggestions.listening.goodFacts.3',
      'suggestions.listening.goodFacts.4',
    ],
    lessons: [
      'suggestions.listening.lessons.0',
      'suggestions.listening.lessons.1',
      'suggestions.listening.lessons.2',
      'suggestions.listening.lessons.3',
      'suggestions.listening.lessons.4',
    ],
  },

  conversation: {
    hardTruths: [
      'suggestions.conversation.hardTruths.0',
      'suggestions.conversation.hardTruths.1',
      'suggestions.conversation.hardTruths.2',
      'suggestions.conversation.hardTruths.3',
      'suggestions.conversation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.conversation.goodFacts.0',
      'suggestions.conversation.goodFacts.1',
      'suggestions.conversation.goodFacts.2',
      'suggestions.conversation.goodFacts.3',
      'suggestions.conversation.goodFacts.4',
    ],
    lessons: [
      'suggestions.conversation.lessons.0',
      'suggestions.conversation.lessons.1',
      'suggestions.conversation.lessons.2',
      'suggestions.conversation.lessons.3',
      'suggestions.conversation.lessons.4',
    ],
  },

  meeting: {
    hardTruths: [
      'suggestions.meeting.hardTruths.0',
      'suggestions.meeting.hardTruths.1',
      'suggestions.meeting.hardTruths.2',
      'suggestions.meeting.hardTruths.3',
      'suggestions.meeting.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.meeting.goodFacts.0',
      'suggestions.meeting.goodFacts.1',
      'suggestions.meeting.goodFacts.2',
      'suggestions.meeting.goodFacts.3',
      'suggestions.meeting.goodFacts.4',
    ],
    lessons: [
      'suggestions.meeting.lessons.0',
      'suggestions.meeting.lessons.1',
      'suggestions.meeting.lessons.2',
      'suggestions.meeting.lessons.3',
      'suggestions.meeting.lessons.4',
    ],
  },

  // Transportation
  bus: {
    hardTruths: [
      'suggestions.bus.hardTruths.0',
      'suggestions.bus.hardTruths.1',
      'suggestions.bus.hardTruths.2',
      'suggestions.bus.hardTruths.3',
      'suggestions.bus.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.bus.goodFacts.0',
      'suggestions.bus.goodFacts.1',
      'suggestions.bus.goodFacts.2',
      'suggestions.bus.goodFacts.3',
      'suggestions.bus.goodFacts.4',
    ],
    lessons: [
      'suggestions.bus.lessons.0',
      'suggestions.bus.lessons.1',
      'suggestions.bus.lessons.2',
      'suggestions.bus.lessons.3',
      'suggestions.bus.lessons.4',
    ],
  },

  train: {
    hardTruths: [
      'suggestions.train.hardTruths.0',
      'suggestions.train.hardTruths.1',
      'suggestions.train.hardTruths.2',
      'suggestions.train.hardTruths.3',
      'suggestions.train.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.train.goodFacts.0',
      'suggestions.train.goodFacts.1',
      'suggestions.train.goodFacts.2',
      'suggestions.train.goodFacts.3',
      'suggestions.train.goodFacts.4',
    ],
    lessons: [
      'suggestions.train.lessons.0',
      'suggestions.train.lessons.1',
      'suggestions.train.lessons.2',
      'suggestions.train.lessons.3',
      'suggestions.train.lessons.4',
    ],
  },

  bike: {
    hardTruths: [
      'suggestions.bike.hardTruths.0',
      'suggestions.bike.hardTruths.1',
      'suggestions.bike.hardTruths.2',
      'suggestions.bike.hardTruths.3',
      'suggestions.bike.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.bike.goodFacts.0',
      'suggestions.bike.goodFacts.1',
      'suggestions.bike.goodFacts.2',
      'suggestions.bike.goodFacts.3',
      'suggestions.bike.goodFacts.4',
    ],
    lessons: [
      'suggestions.bike.lessons.0',
      'suggestions.bike.lessons.1',
      'suggestions.bike.lessons.2',
      'suggestions.bike.lessons.3',
      'suggestions.bike.lessons.4',
    ],
  },

  // More hobbies and activities
  painting: {
    hardTruths: [
      'suggestions.painting.hardTruths.0',
      'suggestions.painting.hardTruths.1',
      'suggestions.painting.hardTruths.2',
      'suggestions.painting.hardTruths.3',
      'suggestions.painting.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.painting.goodFacts.0',
      'suggestions.painting.goodFacts.1',
      'suggestions.painting.goodFacts.2',
      'suggestions.painting.goodFacts.3',
      'suggestions.painting.goodFacts.4',
    ],
    lessons: [
      'suggestions.painting.lessons.0',
      'suggestions.painting.lessons.1',
      'suggestions.painting.lessons.2',
      'suggestions.painting.lessons.3',
      'suggestions.painting.lessons.4',
    ],
  },

  drawing: {
    hardTruths: [
      'suggestions.drawing.hardTruths.0',
      'suggestions.drawing.hardTruths.1',
      'suggestions.drawing.hardTruths.2',
      'suggestions.drawing.hardTruths.3',
      'suggestions.drawing.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.drawing.goodFacts.0',
      'suggestions.drawing.goodFacts.1',
      'suggestions.drawing.goodFacts.2',
      'suggestions.drawing.goodFacts.3',
      'suggestions.drawing.goodFacts.4',
    ],
    lessons: [
      'suggestions.drawing.lessons.0',
      'suggestions.drawing.lessons.1',
      'suggestions.drawing.lessons.2',
      'suggestions.drawing.lessons.3',
      'suggestions.drawing.lessons.4',
    ],
  },

  dancing: {
    hardTruths: [
      'suggestions.dancing.hardTruths.0',
      'suggestions.dancing.hardTruths.1',
      'suggestions.dancing.hardTruths.2',
      'suggestions.dancing.hardTruths.3',
      'suggestions.dancing.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.dancing.goodFacts.0',
      'suggestions.dancing.goodFacts.1',
      'suggestions.dancing.goodFacts.2',
      'suggestions.dancing.goodFacts.3',
      'suggestions.dancing.goodFacts.4',
    ],
    lessons: [
      'suggestions.dancing.lessons.0',
      'suggestions.dancing.lessons.1',
      'suggestions.dancing.lessons.2',
      'suggestions.dancing.lessons.3',
      'suggestions.dancing.lessons.4',
    ],
  },

  singing: {
    hardTruths: [
      'suggestions.singing.hardTruths.0',
      'suggestions.singing.hardTruths.1',
      'suggestions.singing.hardTruths.2',
      'suggestions.singing.hardTruths.3',
      'suggestions.singing.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.singing.goodFacts.0',
      'suggestions.singing.goodFacts.1',
      'suggestions.singing.goodFacts.2',
      'suggestions.singing.goodFacts.3',
      'suggestions.singing.goodFacts.4',
    ],
    lessons: [
      'suggestions.singing.lessons.0',
      'suggestions.singing.lessons.1',
      'suggestions.singing.lessons.2',
      'suggestions.singing.lessons.3',
      'suggestions.singing.lessons.4',
    ],
  },

  baking: {
    hardTruths: [
      'suggestions.baking.hardTruths.0',
      'suggestions.baking.hardTruths.1',
      'suggestions.baking.hardTruths.2',
      'suggestions.baking.hardTruths.3',
      'suggestions.baking.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.baking.goodFacts.0',
      'suggestions.baking.goodFacts.1',
      'suggestions.baking.goodFacts.2',
      'suggestions.baking.goodFacts.3',
      'suggestions.baking.goodFacts.4',
    ],
    lessons: [
      'suggestions.baking.lessons.0',
      'suggestions.baking.lessons.1',
      'suggestions.baking.lessons.2',
      'suggestions.baking.lessons.3',
      'suggestions.baking.lessons.4',
    ],
  },

  // Toxic relationship patterns and experiences
  manipulation: {
    hardTruths: [
      'suggestions.manipulation.hardTruths.0',
      'suggestions.manipulation.hardTruths.1',
      'suggestions.manipulation.hardTruths.2',
      'suggestions.manipulation.hardTruths.3',
      'suggestions.manipulation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.manipulation.goodFacts.0',
      'suggestions.manipulation.goodFacts.1',
      'suggestions.manipulation.goodFacts.2',
      'suggestions.manipulation.goodFacts.3',
      'suggestions.manipulation.goodFacts.4',
    ],
    lessons: [
      'suggestions.manipulation.lessons.0',
      'suggestions.manipulation.lessons.1',
      'suggestions.manipulation.lessons.2',
      'suggestions.manipulation.lessons.3',
      'suggestions.manipulation.lessons.4',
    ],
  },

  gaslighting: {
    hardTruths: [
      'suggestions.gaslighting.hardTruths.0',
      'suggestions.gaslighting.hardTruths.1',
      'suggestions.gaslighting.hardTruths.2',
      'suggestions.gaslighting.hardTruths.3',
      'suggestions.gaslighting.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.gaslighting.goodFacts.0',
      'suggestions.gaslighting.goodFacts.1',
      'suggestions.gaslighting.goodFacts.2',
      'suggestions.gaslighting.goodFacts.3',
      'suggestions.gaslighting.goodFacts.4',
    ],
    lessons: [
      'suggestions.gaslighting.lessons.0',
      'suggestions.gaslighting.lessons.1',
      'suggestions.gaslighting.lessons.2',
      'suggestions.gaslighting.lessons.3',
      'suggestions.gaslighting.lessons.4',
    ],
  },

  control: {
    hardTruths: [
      'suggestions.control.hardTruths.0',
      'suggestions.control.hardTruths.1',
      'suggestions.control.hardTruths.2',
      'suggestions.control.hardTruths.3',
      'suggestions.control.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.control.goodFacts.0',
      'suggestions.control.goodFacts.1',
      'suggestions.control.goodFacts.2',
      'suggestions.control.goodFacts.3',
      'suggestions.control.goodFacts.4',
    ],
    lessons: [
      'suggestions.control.lessons.0',
      'suggestions.control.lessons.1',
      'suggestions.control.lessons.2',
      'suggestions.control.lessons.3',
      'suggestions.control.lessons.4',
    ],
  },

  boundaries: {
    hardTruths: [
      'suggestions.boundaries.hardTruths.0',
      'suggestions.boundaries.hardTruths.1',
      'suggestions.boundaries.hardTruths.2',
      'suggestions.boundaries.hardTruths.3',
      'suggestions.boundaries.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.boundaries.goodFacts.0',
      'suggestions.boundaries.goodFacts.1',
      'suggestions.boundaries.goodFacts.2',
      'suggestions.boundaries.goodFacts.3',
      'suggestions.boundaries.goodFacts.4',
    ],
    lessons: [
      'suggestions.boundaries.lessons.0',
      'suggestions.boundaries.lessons.1',
      'suggestions.boundaries.lessons.2',
      'suggestions.boundaries.lessons.3',
      'suggestions.boundaries.lessons.4',
    ],
  },

  guilt: {
    hardTruths: [
      'suggestions.guilt.hardTruths.0',
      'suggestions.guilt.hardTruths.1',
      'suggestions.guilt.hardTruths.2',
      'suggestions.guilt.hardTruths.3',
      'suggestions.guilt.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.guilt.goodFacts.0',
      'suggestions.guilt.goodFacts.1',
      'suggestions.guilt.goodFacts.2',
      'suggestions.guilt.goodFacts.3',
      'suggestions.guilt.goodFacts.4',
    ],
    lessons: [
      'suggestions.guilt.lessons.0',
      'suggestions.guilt.lessons.1',
      'suggestions.guilt.lessons.2',
      'suggestions.guilt.lessons.3',
      'suggestions.guilt.lessons.4',
    ],
  },

  blame: {
    hardTruths: [
      'suggestions.blame.hardTruths.0',
      'suggestions.blame.hardTruths.1',
      'suggestions.blame.hardTruths.2',
      'suggestions.blame.hardTruths.3',
      'suggestions.blame.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.blame.goodFacts.0',
      'suggestions.blame.goodFacts.1',
      'suggestions.blame.goodFacts.2',
      'suggestions.blame.goodFacts.3',
      'suggestions.blame.goodFacts.4',
    ],
    lessons: [
      'suggestions.blame.lessons.0',
      'suggestions.blame.lessons.1',
      'suggestions.blame.lessons.2',
      'suggestions.blame.lessons.3',
      'suggestions.blame.lessons.4',
    ],
  },

  criticism: {
    hardTruths: [
      'suggestions.criticism.hardTruths.0',
      'suggestions.criticism.hardTruths.1',
      'suggestions.criticism.hardTruths.2',
      'suggestions.criticism.hardTruths.3',
      'suggestions.criticism.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.criticism.goodFacts.0',
      'suggestions.criticism.goodFacts.1',
      'suggestions.criticism.goodFacts.2',
      'suggestions.criticism.goodFacts.3',
      'suggestions.criticism.goodFacts.4',
    ],
    lessons: [
      'suggestions.criticism.lessons.0',
      'suggestions.criticism.lessons.1',
      'suggestions.criticism.lessons.2',
      'suggestions.criticism.lessons.3',
      'suggestions.criticism.lessons.4',
    ],
  },

  isolation: {
    hardTruths: [
      'suggestions.isolation.hardTruths.0',
      'suggestions.isolation.hardTruths.1',
      'suggestions.isolation.hardTruths.2',
      'suggestions.isolation.hardTruths.3',
      'suggestions.isolation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.isolation.goodFacts.0',
      'suggestions.isolation.goodFacts.1',
      'suggestions.isolation.goodFacts.2',
      'suggestions.isolation.goodFacts.3',
      'suggestions.isolation.goodFacts.4',
    ],
    lessons: [
      'suggestions.isolation.lessons.0',
      'suggestions.isolation.lessons.1',
      'suggestions.isolation.lessons.2',
      'suggestions.isolation.lessons.3',
      'suggestions.isolation.lessons.4',
    ],
  },

  jealousy: {
    hardTruths: [
      'suggestions.jealousy.hardTruths.0',
      'suggestions.jealousy.hardTruths.1',
      'suggestions.jealousy.hardTruths.2',
      'suggestions.jealousy.hardTruths.3',
      'suggestions.jealousy.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.jealousy.goodFacts.0',
      'suggestions.jealousy.goodFacts.1',
      'suggestions.jealousy.goodFacts.2',
      'suggestions.jealousy.goodFacts.3',
      'suggestions.jealousy.goodFacts.4',
    ],
    lessons: [
      'suggestions.jealousy.lessons.0',
      'suggestions.jealousy.lessons.1',
      'suggestions.jealousy.lessons.2',
      'suggestions.jealousy.lessons.3',
      'suggestions.jealousy.lessons.4',
    ],
  },

  possessiveness: {
    hardTruths: [
      'suggestions.possessiveness.hardTruths.0',
      'suggestions.possessiveness.hardTruths.1',
      'suggestions.possessiveness.hardTruths.2',
      'suggestions.possessiveness.hardTruths.3',
      'suggestions.possessiveness.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.possessiveness.goodFacts.0',
      'suggestions.possessiveness.goodFacts.1',
      'suggestions.possessiveness.goodFacts.2',
      'suggestions.possessiveness.goodFacts.3',
      'suggestions.possessiveness.goodFacts.4',
    ],
    lessons: [
      'suggestions.possessiveness.lessons.0',
      'suggestions.possessiveness.lessons.1',
      'suggestions.possessiveness.lessons.2',
      'suggestions.possessiveness.lessons.3',
      'suggestions.possessiveness.lessons.4',
    ],
  },

  disrespect: {
    hardTruths: [
      'suggestions.disrespect.hardTruths.0',
      'suggestions.disrespect.hardTruths.1',
      'suggestions.disrespect.hardTruths.2',
      'suggestions.disrespect.hardTruths.3',
      'suggestions.disrespect.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.disrespect.goodFacts.0',
      'suggestions.disrespect.goodFacts.1',
      'suggestions.disrespect.goodFacts.2',
      'suggestions.disrespect.goodFacts.3',
      'suggestions.disrespect.goodFacts.4',
    ],
    lessons: [
      'suggestions.disrespect.lessons.0',
      'suggestions.disrespect.lessons.1',
      'suggestions.disrespect.lessons.2',
      'suggestions.disrespect.lessons.3',
      'suggestions.disrespect.lessons.4',
    ],
  },

  narcissism: {
    hardTruths: [
      'suggestions.narcissism.hardTruths.0',
      'suggestions.narcissism.hardTruths.1',
      'suggestions.narcissism.hardTruths.2',
      'suggestions.narcissism.hardTruths.3',
      'suggestions.narcissism.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.narcissism.goodFacts.0',
      'suggestions.narcissism.goodFacts.1',
      'suggestions.narcissism.goodFacts.2',
      'suggestions.narcissism.goodFacts.3',
      'suggestions.narcissism.goodFacts.4',
    ],
    lessons: [
      'suggestions.narcissism.lessons.0',
      'suggestions.narcissism.lessons.1',
      'suggestions.narcissism.lessons.2',
      'suggestions.narcissism.lessons.3',
      'suggestions.narcissism.lessons.4',
    ],
  },

  abuse: {
    hardTruths: [
      'suggestions.abuse.hardTruths.0',
      'suggestions.abuse.hardTruths.1',
      'suggestions.abuse.hardTruths.2',
      'suggestions.abuse.hardTruths.3',
      'suggestions.abuse.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.abuse.goodFacts.0',
      'suggestions.abuse.goodFacts.1',
      'suggestions.abuse.goodFacts.2',
      'suggestions.abuse.goodFacts.3',
      'suggestions.abuse.goodFacts.4',
    ],
    lessons: [
      'suggestions.abuse.lessons.0',
      'suggestions.abuse.lessons.1',
      'suggestions.abuse.lessons.2',
      'suggestions.abuse.lessons.3',
      'suggestions.abuse.lessons.4',
    ],
  },

  trauma: {
    hardTruths: [
      'suggestions.trauma.hardTruths.0',
      'suggestions.trauma.hardTruths.1',
      'suggestions.trauma.hardTruths.2',
      'suggestions.trauma.hardTruths.3',
      'suggestions.trauma.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.trauma.goodFacts.0',
      'suggestions.trauma.goodFacts.1',
      'suggestions.trauma.goodFacts.2',
      'suggestions.trauma.goodFacts.3',
      'suggestions.trauma.goodFacts.4',
    ],
    lessons: [
      'suggestions.trauma.lessons.0',
      'suggestions.trauma.lessons.1',
      'suggestions.trauma.lessons.2',
      'suggestions.trauma.lessons.3',
      'suggestions.trauma.lessons.4',
    ],
  },

  healing: {
    hardTruths: [
      'suggestions.healing.hardTruths.0',
      'suggestions.healing.hardTruths.1',
      'suggestions.healing.hardTruths.2',
      'suggestions.healing.hardTruths.3',
      'suggestions.healing.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.healing.goodFacts.0',
      'suggestions.healing.goodFacts.1',
      'suggestions.healing.goodFacts.2',
      'suggestions.healing.goodFacts.3',
      'suggestions.healing.goodFacts.4',
    ],
    lessons: [
      'suggestions.healing.lessons.0',
      'suggestions.healing.lessons.1',
      'suggestions.healing.lessons.2',
      'suggestions.healing.lessons.3',
      'suggestions.healing.lessons.4',
    ],
  },

  recovery: {
    hardTruths: [
      'suggestions.recovery.hardTruths.0',
      'suggestions.recovery.hardTruths.1',
      'suggestions.recovery.hardTruths.2',
      'suggestions.recovery.hardTruths.3',
      'suggestions.recovery.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.recovery.goodFacts.0',
      'suggestions.recovery.goodFacts.1',
      'suggestions.recovery.goodFacts.2',
      'suggestions.recovery.goodFacts.3',
      'suggestions.recovery.goodFacts.4',
    ],
    lessons: [
      'suggestions.recovery.lessons.0',
      'suggestions.recovery.lessons.1',
      'suggestions.recovery.lessons.2',
      'suggestions.recovery.lessons.3',
      'suggestions.recovery.lessons.4',
    ],
  },

  selfworth: {
    hardTruths: [
      'suggestions.selfworth.hardTruths.0',
      'suggestions.selfworth.hardTruths.1',
      'suggestions.selfworth.hardTruths.2',
      'suggestions.selfworth.hardTruths.3',
      'suggestions.selfworth.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.selfworth.goodFacts.0',
      'suggestions.selfworth.goodFacts.1',
      'suggestions.selfworth.goodFacts.2',
      'suggestions.selfworth.goodFacts.3',
      'suggestions.selfworth.goodFacts.4',
    ],
    lessons: [
      'suggestions.selfworth.lessons.0',
      'suggestions.selfworth.lessons.1',
      'suggestions.selfworth.lessons.2',
      'suggestions.selfworth.lessons.3',
      'suggestions.selfworth.lessons.4',
    ],
  },

  validation: {
    hardTruths: [
      'suggestions.validation.hardTruths.0',
      'suggestions.validation.hardTruths.1',
      'suggestions.validation.hardTruths.2',
      'suggestions.validation.hardTruths.3',
      'suggestions.validation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.validation.goodFacts.0',
      'suggestions.validation.goodFacts.1',
      'suggestions.validation.goodFacts.2',
      'suggestions.validation.goodFacts.3',
      'suggestions.validation.goodFacts.4',
    ],
    lessons: [
      'suggestions.validation.lessons.0',
      'suggestions.validation.lessons.1',
      'suggestions.validation.lessons.2',
      'suggestions.validation.lessons.3',
      'suggestions.validation.lessons.4',
    ],
  },

  codependency: {
    hardTruths: [
      'suggestions.codependency.hardTruths.0',
      'suggestions.codependency.hardTruths.1',
      'suggestions.codependency.hardTruths.2',
      'suggestions.codependency.hardTruths.3',
      'suggestions.codependency.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.codependency.goodFacts.0',
      'suggestions.codependency.goodFacts.1',
      'suggestions.codependency.goodFacts.2',
      'suggestions.codependency.goodFacts.3',
      'suggestions.codependency.goodFacts.4',
    ],
    lessons: [
      'suggestions.codependency.lessons.0',
      'suggestions.codependency.lessons.1',
      'suggestions.codependency.lessons.2',
      'suggestions.codependency.lessons.3',
      'suggestions.codependency.lessons.4',
    ],
  },

  toxic: {
    hardTruths: [
      'suggestions.toxic.hardTruths.0',
      'suggestions.toxic.hardTruths.1',
      'suggestions.toxic.hardTruths.2',
      'suggestions.toxic.hardTruths.3',
      'suggestions.toxic.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.toxic.goodFacts.0',
      'suggestions.toxic.goodFacts.1',
      'suggestions.toxic.goodFacts.2',
      'suggestions.toxic.goodFacts.3',
      'suggestions.toxic.goodFacts.4',
    ],
    lessons: [
      'suggestions.toxic.lessons.0',
      'suggestions.toxic.lessons.1',
      'suggestions.toxic.lessons.2',
      'suggestions.toxic.lessons.3',
      'suggestions.toxic.lessons.4',
    ],
  },

  redflags: {
    hardTruths: [
      'suggestions.redflags.hardTruths.0',
      'suggestions.redflags.hardTruths.1',
      'suggestions.redflags.hardTruths.2',
      'suggestions.redflags.hardTruths.3',
      'suggestions.redflags.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.redflags.goodFacts.0',
      'suggestions.redflags.goodFacts.1',
      'suggestions.redflags.goodFacts.2',
      'suggestions.redflags.goodFacts.3',
      'suggestions.redflags.goodFacts.4',
    ],
    lessons: [
      'suggestions.redflags.lessons.0',
      'suggestions.redflags.lessons.1',
      'suggestions.redflags.lessons.2',
      'suggestions.redflags.lessons.3',
      'suggestions.redflags.lessons.4',
    ],
  },

  escape: {
    hardTruths: [
      'suggestions.escape.hardTruths.0',
      'suggestions.escape.hardTruths.1',
      'suggestions.escape.hardTruths.2',
      'suggestions.escape.hardTruths.3',
      'suggestions.escape.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.escape.goodFacts.0',
      'suggestions.escape.goodFacts.1',
      'suggestions.escape.goodFacts.2',
      'suggestions.escape.goodFacts.3',
      'suggestions.escape.goodFacts.4',
    ],
    lessons: [
      'suggestions.escape.lessons.0',
      'suggestions.escape.lessons.1',
      'suggestions.escape.lessons.2',
      'suggestions.escape.lessons.3',
      'suggestions.escape.lessons.4',
    ],
  },

  freedom: {
    hardTruths: [
      'suggestions.freedom.hardTruths.0',
      'suggestions.freedom.hardTruths.1',
      'suggestions.freedom.hardTruths.2',
      'suggestions.freedom.hardTruths.3',
      'suggestions.freedom.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.freedom.goodFacts.0',
      'suggestions.freedom.goodFacts.1',
      'suggestions.freedom.goodFacts.2',
      'suggestions.freedom.goodFacts.3',
      'suggestions.freedom.goodFacts.4',
    ],
    lessons: [
      'suggestions.freedom.lessons.0',
      'suggestions.freedom.lessons.1',
      'suggestions.freedom.lessons.2',
      'suggestions.freedom.lessons.3',
      'suggestions.freedom.lessons.4',
    ],
  },

  liberation: {
    hardTruths: [
      'suggestions.liberation.hardTruths.0',
      'suggestions.liberation.hardTruths.1',
      'suggestions.liberation.hardTruths.2',
      'suggestions.liberation.hardTruths.3',
      'suggestions.liberation.hardTruths.4',
    ],
    goodFacts: [
      'suggestions.liberation.goodFacts.0',
      'suggestions.liberation.goodFacts.1',
      'suggestions.liberation.goodFacts.2',
      'suggestions.liberation.goodFacts.3',
      'suggestions.liberation.goodFacts.4',
    ],
    lessons: [
      'suggestions.liberation.lessons.0',
      'suggestions.liberation.lessons.1',
      'suggestions.liberation.lessons.2',
      'suggestions.liberation.lessons.3',
      'suggestions.liberation.lessons.4',
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
