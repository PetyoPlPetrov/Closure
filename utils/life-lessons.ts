/**
 * Life lessons utility for providing inspirational placeholder text
 * Returns random life lessons to inspire users when adding lessons to memories
 */

export const lifeLessons = {
  en: [
    'Sometimes letting go is the strongest thing you can do',
    'Growth happens outside your comfort zone',
    'You can\'t control others, only your response to them',
    'Self-worth comes from within, not from others\' validation',
    'Boundaries are essential for healthy relationships',
    'It\'s okay to prioritize your own happiness',
    'Forgiveness is for you, not for them',
    'Not every relationship is meant to last forever',
    'Your feelings are valid, even if others don\'t understand them',
    'Closure comes from within, not from others',
    'You deserve someone who chooses you every day',
    'Time doesn\'t heal all wounds, but processing them does',
    'You can love someone and still choose to walk away',
    'Red flags ignored become red carpets you walk on',
    'People treat you the way you allow them to',
    'Sometimes the hardest goodbyes lead to the best hellos',
    'You can\'t pour from an empty cup - take care of yourself first',
    'Trust your intuition - it knows what your mind tries to rationalize',
    'The right person will never make you question your worth',
    'Healing isn\'t linear, and that\'s okay',
  ],
  bg: [
    'Понякога да пуснеш е най-силното нещо, което можеш да направиш',
    'Растежът се случва извън зоната ти на комфорт',
    'Не можеш да контролираш другите, само реакцията си към тях',
    'Самочувствието идва отвътре, не от одобрението на другите',
    'Границите са от съществено значение за здравите взаимоотношения',
    'Добре е да поставиш собственото си щастие на първо място',
    'Прошката е за теб, не за тях',
    'Не всяка връзка е предназначена да продължи вечно',
    'Чувствата ти са валидни, дори другите да не ги разбират',
    'Приключването идва отвътре, не от другите',
    'Заслужаваш някой, който те избира всеки ден',
    'Времето не лекува всички рани, но обработването им го прави',
    'Можеш да обичаш някого и все пак да избереш да си тръгнеш',
    'Червените знамена, когато се игнорират, стават червени килими, по които вървиш',
    'Хората те третират по начина, по който им позволяваш',
    'Понякога най-трудните сбогувания водят до най-добрите здравета',
    'Не можеш да наливаш от празна чаша - погрижи се първо за себе си',
    'Вярвай на интуицията си - тя знае това, което умът ти се опитва да рационализира',
    'Правилният човек никога няма да те кара да се съмняваш в стойността си',
    'Изцелението не е линейно и това е нормално',
  ],
};

/**
 * Get a random life lesson for the specified language
 * @param language - 'en' or 'bg'
 * @returns A random life lesson string
 */
export function getRandomLifeLesson(language: 'en' | 'bg' = 'en'): string {
  const lessons = lifeLessons[language];
  const randomIndex = Math.floor(Math.random() * lessons.length);
  return lessons[randomIndex];
}

/**
 * Format life lesson as placeholder text
 * @param language - 'en' or 'bg'
 * @returns Formatted placeholder text with "Ex.: {random lesson}"
 */
export function getLifeLessonPlaceholder(language: 'en' | 'bg' = 'en'): string {
  const lesson = getRandomLifeLesson(language);
  return `Ex.: ${lesson}`;
}
