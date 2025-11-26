/**
 * Translation system for Closure app
 * Supports English (en) and Bulgarian (bg)
 */

export type Language = 'en' | 'bg';

export interface Translations {
  // Tab labels
  'tab.home': string;
  'tab.exProfiles': string;
  'tab.settings': string;
  
  // Settings
  'settings.title': string;
  'settings.language': string;
  'settings.language.description': string;
  'settings.language.english': string;
  'settings.language.bulgarian': string;
  
  // Common
  'common.back': string;
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.edit': string;
  'common.add': string;
  'common.close': string;
  'common.confirm': string;
  'common.yes': string;
  'common.no': string;
  
  // Profile screens
  'profile.add': string;
  'profile.edit': string;
  'profile.editExInfo': string;
  'profile.editMemories': string;
  'profile.editProfile': string;
  'profile.editProfile.description': string;
  'profile.name': string;
  'profile.exPartnerName': string;
  'profile.exPartnerName.placeholder': string;
  'profile.description': string;
  'profile.description.placeholder': string;
  'profile.description.example': string;
  'profile.uploadPicture': string;
  'profile.tapToAddPhoto': string;
  'profile.changePicture': string;
  'profile.openingGallery': string;
  'profile.supportedFormats': string;
  'profile.delete': string;
  'profile.delete.confirm': string;
  'profile.delete.confirm.message': string;
  'profile.delete.confirm.message.withName': string;
  'profile.viewHealingPath': string;
  'profile.beginNewPath': string;
  'profile.beginNewPath.description': string;
  'profile.editNewPath': string;
  'profile.editNewPath.description': string;
  'profile.startHealingPath': string;
  'profile.emptyState.title': string;
  'profile.emptyState.description': string;
  'profile.emptyState.button': string;
  'profile.actionSheet.edit': string;
  'profile.actionSheet.viewHealingPath': string;
  'profile.actionSheet.delete': string;
  'profile.setup.complete': string;
  'profile.setup.incomplete': string;
  'profile.relationship': string;
  
  // Memory screens
  'memory.add': string;
  'memory.edit': string;
  'memory.title': string;
  'memory.title.placeholder': string;
  'memory.hardTruth': string;
  'memory.hardTruth.plural': string;
  'memory.hardTruth.none': string;
  'memory.hardTruth.add': string;
  'memory.hardTruth.placeholder': string;
  'memory.cloudyMoment': string;
  'memory.goodFact': string;
  'memory.goodFact.plural': string;
  'memory.goodFact.none': string;
  'memory.goodFact.add': string;
  'memory.goodFact.placeholder': string;
  'memory.sunnyMoment': string;
  'memory.fillAllClouds': string;
  'memory.fillAllSuns': string;
  'memory.save': string;
  'memory.delete': string;
  'memory.delete.confirm': string;
  'memory.delete.confirm.message': string;
  'memory.delete.confirm.message.withTitle': string;
  'memory.emptyState.title': string;
  'memory.emptyState.description': string;
  'memory.error.titleRequired': string;
  'memory.error.saveFailed': string;
  'memory.error.deleteFailed': string;
  'memory.actionSheet.edit': string;
  'memory.actionSheet.delete': string;
  
  // Healing path
  'healingPath.title': string;
  'healingPath.description': string;
  'healingPath.begin': string;
  'healingPath.step1': string;
  'healingPath.step1.title': string;
  'healingPath.step1.description': string;
  'healingPath.step2': string;
  'healingPath.step2.title': string;
  'healingPath.step2.description': string;
  'healingPath.step3': string;
  'healingPath.step3.title': string;
  'healingPath.step3.description': string;
  
  // Reality check
  'realityCheck.title': string;
  
  // Errors
  'error.profileIdMissing': string;
  'error.saveFailed': string;
  'error.deleteFailed': string;
  'error.loadFailed': string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Tab labels
    'tab.home': 'Home',
    'tab.exProfiles': 'Ex Profiles',
    'tab.settings': 'Settings',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.language.description': 'Choose your preferred language',
    'settings.language.english': 'English',
    'settings.language.bulgarian': 'Bulgarian',
    
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Profile screens
    'profile.add': 'Add Ex Profile',
    'profile.edit': 'Edit Profile',
    'profile.editExInfo': 'Edit Ex Info',
    'profile.editMemories': 'Edit Memories',
    'profile.editProfile': 'Edit Profile',
    'profile.editProfile.description': 'Choose what you\'d like to edit for this profile.',
    'profile.name': 'Name',
    'profile.exPartnerName': 'Ex-partner\'s Name',
    'profile.exPartnerName.placeholder': 'Enter their name',
    'profile.description': 'Description',
    'profile.description.placeholder': 'Enter a short description (max 30 characters)',
    'profile.description.example': 'e.g., College sweetheart, first love...',
    'profile.uploadPicture': 'Add a Picture',
    'profile.tapToAddPhoto': 'Tap to Add Photo',
    'profile.changePicture': 'Change Picture',
    'profile.openingGallery': 'Opening gallery...',
    'profile.supportedFormats': 'PNG, JPG or GIF',
    'profile.delete': 'Delete',
    'profile.delete.confirm': 'Delete Profile',
    'profile.delete.confirm.message': 'Are you sure you want to delete this profile? This will permanently delete all associated memories, hard truths, and data. This action cannot be undone.',
    'profile.delete.confirm.message.withName': 'Are you sure you want to delete {name}\'s profile? This will permanently delete all associated memories, hard truths, and data. This action cannot be undone.',
    'profile.viewHealingPath': 'View Healing Path',
    'profile.beginNewPath': 'Begin a New Path',
    'profile.beginNewPath.description': 'Let\'s start by focusing on one relationship at a time.',
    'profile.editNewPath': 'Edit New Path',
    'profile.editNewPath.description': 'Update your profile information and continue your healing journey.',
    'profile.startHealingPath': 'Start Healing Path',
    'profile.emptyState.title': 'Begin Your Journey to Closure',
    'profile.emptyState.description': 'This is a safe space to document past relationships objectively. Creating a profile is the first constructive step towards understanding and moving on.',
    'profile.emptyState.button': 'Add Your First Ex Profile',
    'profile.actionSheet.edit': 'Edit Profile',
    'profile.actionSheet.viewHealingPath': 'View Healing Path',
    'profile.actionSheet.delete': 'Delete Profile',
    'profile.setup.complete': 'Setup Complete',
    'profile.setup.incomplete': 'Incomplete Setup ({percentage}%)',
    'profile.relationship': 'Relationship',
    
    // Memory screens
    'memory.add': 'Add Memory',
    'memory.edit': 'Edit Memory',
    'memory.title': 'Memory Title',
    'memory.title.placeholder': 'Memory title',
    'memory.hardTruth': 'Hard Truth',
    'memory.hardTruth.plural': 'Hard Truths',
    'memory.hardTruth.none': 'No Hard Truths yet',
    'memory.hardTruth.add': 'Add Hard Truth',
    'memory.hardTruth.placeholder': 'Enter hard truth...',
    'memory.cloudyMoment': 'Cloudy Moment',
    'memory.goodFact': 'Good Fact',
    'memory.goodFact.plural': 'Good Facts',
    'memory.goodFact.none': 'No Good Facts yet',
    'memory.goodFact.add': 'Add Good Fact',
    'memory.goodFact.placeholder': 'Enter good fact...',
    'memory.sunnyMoment': 'Sunny Moment',
    'memory.fillAllClouds': 'Please fill all available clouds with text before continuing.',
    'memory.fillAllSuns': 'Please fill all available suns with text before continuing.',
    'memory.save': 'Save Memory',
    'memory.delete': 'Delete',
    'memory.delete.confirm': 'Delete Memory',
    'memory.delete.confirm.message': 'Are you sure you want to delete this memory? This action cannot be undone.',
    'memory.delete.confirm.message.withTitle': 'Are you sure you want to delete "{title}"? This action cannot be undone.',
    'memory.emptyState.title': 'No Idealized Memories Yet',
    'memory.emptyState.description': 'This is the first step to gaining clarity. Listing your idealized memories helps you counter them with reality, turning rumination into action.',
    'memory.error.titleRequired': 'Please enter a memory title.',
    'memory.error.saveFailed': 'Failed to save memory. Please try again.',
    'memory.error.deleteFailed': 'Failed to delete memory. Please try again.',
    'memory.actionSheet.edit': 'Edit',
    'memory.actionSheet.delete': 'Delete',
    
    // Healing path
    'healingPath.title': 'Your Path to Healing',
    'healingPath.description': 'Welcome to your journey of Active Detachment. Here is your roadmap to a new beginning.',
    'healingPath.begin': 'Begin Your Journey',
    'healingPath.step1': 'STEP 1',
    'healingPath.step1.title': 'Reality Check',
    'healingPath.step1.description': 'Confront idealization with objective facts. Commit to seeing the past clearly.',
    'healingPath.step2': 'STEP 2',
    'healingPath.step2.title': 'Processing & Accountability',
    'healingPath.step2.description': 'Turn painful memories into lessons for growth through guided exercises.',
    'healingPath.step3': 'STEP 3',
    'healingPath.step3.title': 'Identity & Future Focus',
    'healingPath.step3.description': 'Rediscover your individuality and build a future that is entirely your own.',
    
    // Reality check
    'realityCheck.title': 'Reality Check',
    
    // Errors
    'error.profileIdMissing': 'Profile ID is missing. Redirecting back...',
    'error.saveFailed': 'Failed to save. Please try again.',
    'error.deleteFailed': 'Failed to delete. Please try again.',
    'error.loadFailed': 'Failed to load. Please try again.',
  },
  bg: {
    // Tab labels
    'tab.home': 'Начало',
    'tab.exProfiles': 'Бивши Партньори',
    'tab.settings': 'Настройки',
    
    // Settings
    'settings.title': 'Настройки',
    'settings.language': 'Език',
    'settings.language.description': 'Изберете предпочитания език',
    'settings.language.english': 'Английски',
    'settings.language.bulgarian': 'Български',
    
    // Common
    'common.back': 'Назад',
    'common.save': 'Запази',
    'common.cancel': 'Отказ',
    'common.delete': 'Изтрий',
    'common.edit': 'Редактирай',
    'common.add': 'Добави',
    'common.close': 'Затвори',
    'common.confirm': 'Потвърди',
    'common.yes': 'Да',
    'common.no': 'Не',
    
    // Profile screens
    'profile.add': 'Добави Бивш Партньор',
    'profile.edit': 'Редактирай Профил',
    'profile.editExInfo': 'Редактирай Информация',
    'profile.editMemories': 'Редактирай Спомени',
    'profile.editProfile': 'Редактирай Профил',
    'profile.editProfile.description': 'Изберете какво искате да редактирате за този профил.',
    'profile.name': 'Име',
    'profile.exPartnerName': 'Име на Бившия Партньор',
    'profile.exPartnerName.placeholder': 'Въведете името им',
    'profile.description': 'Описание',
    'profile.description.placeholder': 'Въведете кратко описание (макс. 30 символа)',
    'profile.description.example': 'напр. Студентска любов, първа любов...',
    'profile.uploadPicture': 'Добави Снимка',
    'profile.tapToAddPhoto': 'Докоснете, за да добавите снимка',
    'profile.changePicture': 'Промени Снимка',
    'profile.openingGallery': 'Отваряне на галерия...',
    'profile.supportedFormats': 'PNG, JPG или GIF',
    'profile.delete': 'Изтрий',
    'profile.delete.confirm': 'Изтрий Профил',
    'profile.delete.confirm.message': 'Сигурни ли сте, че искате да изтриете този профил? Това ще изтрие постоянно всички свързани спомени, сурови истини и данни. Това действие не може да бъде отменено.',
    'profile.delete.confirm.message.withName': 'Сигурни ли сте, че искате да изтриете профила на {name}? Това ще изтрие постоянно всички свързани спомени, сурови истини и данни. Това действие не може да бъде отменено.',
    'profile.viewHealingPath': 'Виж Пътя на Изцеление',
    'profile.beginNewPath': 'Започни Нов Път',
    'profile.beginNewPath.description': 'Нека започнем, като се фокусираме върху една връзка наведнъж.',
    'profile.editNewPath': 'Редактирай Нов Път',
    'profile.editNewPath.description': 'Актуализирайте информацията за вашия профил и продължете пътуването си към изцеление.',
    'profile.startHealingPath': 'Започни Пътя на Изцеление',
    'profile.emptyState.title': 'Започнете Вашето Пътешествие към Изцеление',
    'profile.emptyState.description': 'Това е безопасно пространство за обективно документиране на минали връзки. Създаването на профил е първата конструктивна стъпка към разбиране и придвижване напред.',
    'profile.emptyState.button': 'Добави Първия Бивш Партньор',
    'profile.actionSheet.edit': 'Редактирай Профил',
    'profile.actionSheet.viewHealingPath': 'Виж Пътя на Изцеление',
    'profile.actionSheet.delete': 'Изтрий Профил',
    'profile.setup.complete': 'Настройка Завършена',
    'profile.setup.incomplete': 'Незавършена Настройка ({percentage}%)',
    'profile.relationship': 'Връзка',
    
    // Memory screens
    'memory.add': 'Добави Спомен',
    'memory.edit': 'Редактирай Спомен',
    'memory.title': 'Заглавие на Спомена',
    'memory.title.placeholder': 'Заглавие на спомена',
    'memory.hardTruth': 'Сурова Истина',
    'memory.hardTruth.plural': 'Сурови Истини',
    'memory.hardTruth.none': 'Все още няма сурови истини',
    'memory.hardTruth.add': 'Сурова Истина',
    'memory.hardTruth.placeholder': 'сурова истина...',
    'memory.cloudyMoment': 'Облачен Момент',
    'memory.goodFact': 'Добър Факт',
    'memory.goodFact.plural': 'Добри Факти',
    'memory.goodFact.none': 'Все още няма добри факти',
    'memory.goodFact.add': 'Добър Факт',
    'memory.goodFact.placeholder': ' добър момент...',
    'memory.sunnyMoment': 'Слънчев Момент',
    'memory.fillAllClouds': 'Моля, попълнете всички облаци с текст, преди да продължите.',
    'memory.fillAllSuns': 'Моля, попълнете всички слънца с текст, преди да продължите.',
    'memory.save': 'Запази Спомен',
    'memory.delete': 'Изтрий',
    'memory.delete.confirm': 'Изтрий Спомен',
    'memory.delete.confirm.message': 'Сигурни ли сте, че искате да изтриете този спомен? Това действие не може да бъде отменено.',
    'memory.delete.confirm.message.withTitle': 'Сигурни ли сте, че искате да изтриете "{title}"? Това действие не може да бъде отменено.',
    'memory.emptyState.title': 'Все още няма идеализирани спомени',
    'memory.emptyState.description': 'Това е първата стъпка към яснота. Изброяването на вашите идеализирани спомени ви помага да ги противопоставите на реалността, превръщайки размишленията в действие.',
    'memory.error.titleRequired': 'Моля, въведете заглавие на спомена.',
    'memory.error.saveFailed': 'Неуспешно запазване на спомена. Моля, опитайте отново.',
    'memory.error.deleteFailed': 'Неуспешно изтриване на спомена. Моля, опитайте отново.',
    'memory.actionSheet.edit': 'Редактирай',
    'memory.actionSheet.delete': 'Изтрий',
    
    // Healing path
    'healingPath.title': 'Вашият Път към Изцеление',
    'healingPath.description': 'Добре дошли в вашето пътешествие на Активно Откъсване. Ето вашия пътеводител към ново начало.',
    'healingPath.begin': 'Започнете Вашето Пътешествие',
    'healingPath.step1': 'СТЪПКА 1',
    'healingPath.step1.title': 'Проверка на Реалността',
    'healingPath.step1.description': 'Изправете се срещу идеализацията с обективни факти. Ангажирайте се да виждате миналото ясно.',
    'healingPath.step2': 'СТЪПКА 2',
    'healingPath.step2.title': 'Обработка и Отговорност',
    'healingPath.step2.description': 'Превърнете болезнените спомени в уроци за растеж чрез насочени упражнения.',
    'healingPath.step3': 'СТЪПКА 3',
    'healingPath.step3.title': 'Идентичност и Фокус в Бъдещето',
    'healingPath.step3.description': 'Открийте отново своята индивидуалност и изградете бъдеще, което е изцяло ваше.',
    
    // Reality check
    'realityCheck.title': 'Проверка на Реалността',
    
    // Errors
    'error.profileIdMissing': 'ID на профила липсва. Пренасочване назад...',
    'error.saveFailed': 'Неуспешно запазване. Моля, опитайте отново.',
    'error.deleteFailed': 'Неуспешно изтриване. Моля, опитайте отново.',
    'error.loadFailed': 'Неуспешно зареждане. Моля, опитайте отново.',
  },
};

export const getTranslation = (key: keyof Translations, language: Language): string => {
  return translations[language][key] || translations.en[key] || key;
};

/**
 * Translate a category name
 */
export const translateCategory = (category: string, language: Language): string => {
  if (!category) {
    return category;
  }
  
  const categoryKey = `category.${category}` as keyof Translations;
  
  // For Bulgarian, prioritize Bulgarian translation
  if (language === 'bg') {
    const bgTranslation = translations.bg[categoryKey];
    if (bgTranslation && bgTranslation !== categoryKey) {
      return bgTranslation;
    }
    // Fallback to English if Bulgarian doesn't exist
    const enTranslation = translations.en[categoryKey];
    if (enTranslation && enTranslation !== categoryKey) {
      return enTranslation;
    }
  } else {
    // For English, use English translation
    const enTranslation = translations.en[categoryKey];
    if (enTranslation && enTranslation !== categoryKey) {
      return enTranslation;
    }
  }
  
  // If no translation exists at all, return the original category name
  return category;
};

