/**
 * Translation system for Closure app
 * Supports English (en) and Bulgarian (bg)
 */

export type Language = 'en' | 'bg';

export interface Translations {
  // Tab labels
  'tab.home': string;
  'tab.exProfiles': string;
  'tab.spheres': string;
  'tab.settings': string;
  'home.emptyState': string;
  
  // Settings
  'settings.title': string;
  'settings.language': string;
  'settings.language.description': string;
  'settings.language.english': string;
  'settings.language.bulgarian': string;
  'settings.theme': string;
  'settings.theme.description': string;
  'settings.theme.light': string;
  'settings.theme.dark': string;
  'settings.theme.system': string;
  'settings.devTools.generateData.success': string;
  'settings.devTools.generateData.error': string;
  'settings.devTools.clearData.title': string;
  'settings.devTools.clearData.message': string;
  'settings.devTools.clearData.deleteButton': string;
  'settings.devTools.clearData.success': string;
  'settings.devTools.clearData.error': string;
  'settings.devTools.cleanupMemories.button': string;
  'settings.devTools.cleanupMemories.success.withCount': string;
  'settings.devTools.cleanupMemories.success.noOrphans': string;
  'settings.devTools.cleanupMemories.error': string;
  'settings.notifications.title': string;
  'settings.notifications.manage': string;
  'settings.devTools.title': string;
  'settings.devTools.generateData.button': string;
  'settings.devTools.generateData.generating': string;
  'settings.devTools.clearData.button': string;
  'settings.devTools.clearData.deleting': string;

  // Wheel of Life
  'wheel.noLessons.message': string;
  'wheel.noHardTruths.message': string;
  'wheel.noSunnyMoments.message': string;
  'wheel.spinForRandom': string;

  // Streak Rules Modal
  'streakRules.title': string;
  'streakRules.badges.title': string;
  'streakRules.badges.subtitle': string;
  'streakRules.badge.requires': string;
  'streakRules.badge.requires.day': string;
  'streakRules.badge.requires.days': string;
  'streakRules.rarity.common': string;
  'streakRules.rarity.rare': string;
  'streakRules.rarity.epic': string;
  'streakRules.rarity.legendary': string;
  'streakRules.badge.spark.name': string;
  'streakRules.badge.spark.description': string;
  'streakRules.badge.flame.name': string;
  'streakRules.badge.flame.description': string;
  'streakRules.badge.keeper.name': string;
  'streakRules.badge.keeper.description': string;
  'streakRules.badge.champion.name': string;
  'streakRules.badge.champion.description': string;
  'streakRules.badge.warrior.name': string;
  'streakRules.badge.warrior.description': string;
  'streakRules.badge.legend.name': string;
  'streakRules.badge.legend.description': string;
  'streakRules.badge.titan.name': string;
  'streakRules.badge.titan.description': string;
  'streakRules.badge.immortal.name': string;
  'streakRules.badge.immortal.description': string;
  'streak.badge.day': string;
  'streak.badge.days': string;
  'streak.modal.title': string;
  'streak.modal.currentStreak': string;
  'streak.modal.longestStreak': string;
  'streak.modal.totalDays': string;
  'streak.modal.badgesEarned': string;
  'streak.modal.nextBadge': string;
  'streak.modal.daysToGo': string;
  'streak.modal.badgeCollection': string;
  'streak.modal.startJourney': string;
  'streak.modal.motivation.start': string;
  'streak.modal.motivation.building': string;
  'streak.modal.motivation.progress': string;
  'streak.modal.motivation.consistency': string;
  'streak.modal.motivation.legend': string;
  
  // Common
  'common.back': string;
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.done': string;
  'common.edit': string;
  'common.add': string;
  'common.close': string;
  'common.confirm': string;
  'common.yes': string;
  'common.no': string;
  'common.ok': string;
  'common.success': string;
  'common.error': string;
  'common.optional': string;
  'common.discard': string;
  'memory.unsavedChanges.title': string;
  'memory.unsavedChanges.message': string;
  
  // Walkthrough
  'walkthrough.title': string;
  'walkthrough.message': string;
  'walkthrough.button': string;
  
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
  'profile.changePicture': string;
  'profile.openingGallery': string;
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
  'profile.ongoing.error.title': string;
  'profile.ongoing.error.message': string;
  'profile.ongoing.warning': string;
  'profile.date.error.endBeforeStart': string;
  'profile.date.error.startAfterEnd': string;
  'profile.relationshipStartDate': string;
  'profile.relationshipStartDate.select': string;
  'profile.relationshipStartDate.selectTitle': string;
  'profile.relationshipEndDate': string;
  'profile.relationshipEndDate.select': string;
  'profile.relationshipEndDate.selectTitle': string;
  'profile.relationshipOngoing': string;
  'profile.familyMemberName': string;
  'profile.familyMemberName.placeholder': string;
  'profile.relationshipType': string;
  'profile.relationshipType.placeholder': string;
  'profile.addFamilyMember': string;
  'profile.editFamilyMember': string;
  'profile.editFamilyInfo': string;
  'profile.editFriendInfo': string;
  'profile.editHobbyInfo': string;
  'profile.familyEmptyState.title': string;
  'profile.familyEmptyState.description': string;
  'profile.familyEmptyState.button': string;
  'profile.familyDelete.confirm': string;
  'profile.familyDelete.confirm.message': string;
  'profile.familyDelete.confirm.message.withName': string;
  'profile.familyActionSheet.edit': string;
  'profile.familyActionSheet.delete': string;
  'profile.friendName': string;
  'profile.friendName.placeholder': string;
  'profile.addFriend': string;
  'profile.addFriend.description': string;
  'profile.editFriend': string;
  'profile.editFriend.description': string;
  'profile.friendEmptyState.title': string;
  'profile.friendEmptyState.description': string;
  'profile.friendEmptyState.button': string;
  'profile.friendDelete.confirm': string;
  'profile.friendDelete.confirm.message': string;
  'profile.friendDelete.confirm.message.withName': string;
  'profile.friendActionSheet.edit': string;
  'profile.friendActionSheet.delete': string;
  'profile.friend.name.required': string;
  'profile.hobbyName': string;
  'profile.hobbyName.placeholder': string;
  'profile.addHobby': string;
  'profile.addHobby.description': string;
  'profile.editHobby': string;
  'profile.editHobby.description': string;
  'profile.hobbyEmptyState.title': string;
  'profile.hobbyEmptyState.description': string;
  'profile.hobbyEmptyState.button': string;
  'profile.hobbyDelete.confirm': string;
  'profile.hobbyDelete.confirm.message': string;
  'profile.hobbyDelete.confirm.message.withName': string;
  'profile.hobbyActionSheet.edit': string;
  'profile.hobbyActionSheet.delete': string;
  'profile.hobby.name.required': string;
  'job.addJob': string;
  'job.editJob': string;
  'job.editJobInfo': string;
  'job.jobTitle': string;
  'job.jobTitle.placeholder': string;
  'job.companyName': string;
  'job.companyName.placeholder': string;
  'job.jobDescription': string;
  'job.jobDescription.placeholder': string;
  'job.jobEmptyState.title': string;
  'job.jobEmptyState.description': string;
  'job.jobEmptyState.button': string;
  'job.jobDelete.confirm': string;
  'job.jobDelete.confirm.message': string;
  'job.jobDelete.confirm.message.withName': string;
  'job.jobActionSheet.edit': string;
  'job.jobActionSheet.delete': string;
  'spheres.title': string;
  'spheres.encouragement.general': string;
  'spheres.encouragement.goodMomentsPrevail': string;
  'spheres.encouragement.keepPushing': string;
  'spheres.encouragement.calculating': string;
  'spheres.wheelOfLife.lessonLearned': string;
  'spheres.relationships': string;
  'spheres.career': string;
  'spheres.family': string;
  'spheres.friends': string;
  'spheres.hobbies': string;
  'spheres.item': string;
  'spheres.items': string;
  
  // Insights
  'insights.wheelOfLife.title': string;
  'insights.wheelOfLife.subtitle': string;
  'insights.wheelOfLife.distributionExplanation': string;
  'insights.wheelOfLife.percentageExplanation': string;
  'insights.recommendations.title': string;
  'insights.relationships.critical': string;
  'insights.relationships.needsImprovement': string;
  'insights.relationships.strength': string;
  'insights.career.critical': string;
  'insights.career.needsImprovement': string;
  'insights.career.strength': string;
  'insights.family.critical': string;
  'insights.family.needsImprovement': string;
  'insights.family.strength': string;
  'insights.relationships.current.low': string;
  'insights.relationships.pattern.current': string;
  'insights.career.current.low': string;
  'insights.career.pattern.current': string;
  'insights.family.member.low': string;
  'insights.family.pattern': string;
  'insights.comparison.currentRelationships': string;
  'insights.comparison.pastRelationships': string;
  'insights.comparison.currentJobs': string;
  'insights.comparison.pastJobs': string;
  'insights.comparison.label.current': string;
  'insights.comparison.label.ex': string;
  'insights.comparison.label.past': string;
  'insights.comparison.familyMembers': string;
  'insights.comparison.relationships.title': string;
  'insights.comparison.relationships.chartTitle': string;
  'insights.comparison.relationships.subtitle': string;
  'insights.comparison.relationships.requiresEntities': string;
  'insights.comparison.relationships.goodMoments': string;
  'insights.comparison.relationships.badMoments': string;
  'insights.comparison.relationships.you': string;
  'insights.comparison.relationships.partner': string;
  'insights.comparison.relationships.cloudyLabel': string;
  'insights.comparison.relationships.facts': string;
  'insights.comparison.relationships.warning.lower': string;
  'insights.comparison.relationships.warning.close': string;
  'insights.comparison.relationships.kudos': string;
  'insights.comparison.relationships.percentageExplanationTitle': string;
  'insights.comparison.relationships.percentageExplanation': string;
  'insights.comparison.relationships.totalMoments': string;
  'insights.comparison.relationships.quality': string;
  'insights.comparison.relationships.sphereComparison.moreRelationshipTime': string;
  'insights.comparison.relationships.sphereComparison.moreCareerTime': string;
  'insights.comparison.relationships.sphereComparison.balancedTime': string;
  'insights.comparison.relationships.sphereComparison.betterRelationshipQuality': string;
  'insights.comparison.relationships.sphereComparison.betterCareerQuality': string;
  'insights.comparison.general.balance': string;
  'insights.comparison.requiresEntities': string;
  'insights.comparison.career.title': string;
  'insights.comparison.career.chartTitle': string;
  'insights.comparison.career.subtitle': string;
  'insights.comparison.career.requiresEntities': string;
  'insights.comparison.career.goodMoments': string;
  'insights.comparison.career.badMoments': string;
  'insights.comparison.career.warning.lower': string;
  'insights.comparison.career.warning.close': string;
  'insights.comparison.career.kudos': string;
  'insights.comparison.career.percentageExplanationTitle': string;
  'insights.comparison.career.percentageExplanation': string;
  'insights.comparison.career.totalMoments': string;
  'insights.comparison.career.quality': string;
  'insights.comparison.career.sphereComparison.moreCareerTime': string;
  'insights.comparison.career.sphereComparison.moreRelationshipTime': string;
  'insights.comparison.career.sphereComparison.balancedTime': string;
  'insights.comparison.career.sphereComparison.betterCareerQuality': string;
  'insights.comparison.career.sphereComparison.betterRelationshipQuality': string;
  'insights.comparison.family.title': string;
  'insights.comparison.family.subtitle': string;
  'insights.comparison.family.totalMoments': string;
  'insights.comparison.family.quality': string;
  'insights.comparison.family.sunny': string;
  'insights.comparison.family.cloudy': string;
  'insights.comparison.family.noData': string;
  'insights.comparison.family.requiresEntities': string;
  'insights.comparison.family.insight.moreFamilyTime': string;
  'insights.comparison.family.insight.moreCareerTime': string;
  'insights.comparison.family.insight.balancedTime': string;
  'insights.comparison.family.insight.betterFamilyQuality': string;
  'insights.comparison.family.insight.betterCareerQuality': string;
  'insights.comparison.family.members.title': string;
  'insights.comparison.family.members.balanced': string;
  'insights.comparison.family.members.catchUp': string;
  'insights.comparison.family.members.andQuality': string;
  'insights.comparison.family.members.qualityTime': string;
  'insights.comparison.family.members.mostTime': string;
  'insights.comparison.friends.title': string;
  'insights.comparison.friends.subtitle': string;
  'insights.comparison.friends.noData': string;
  'insights.comparison.friends.requiresEntities': string;
  'insights.comparison.friends.otherSpheres': string;
  'insights.comparison.friends.insight.moreFriendsTime': string;
  'insights.comparison.friends.insight.moreOtherSpheresTime': string;
  'insights.comparison.friends.insight.balancedTime': string;
  'insights.comparison.friends.members.title': string;
  'insights.comparison.friends.members.balanced': string;
  'insights.comparison.friends.members.catchUp': string;
  'insights.comparison.friends.members.andQuality': string;
  'insights.comparison.friends.members.qualityTime': string;
  'insights.comparison.friends.members.mostTime': string;
  'insights.comparison.hobbies.title': string;
  'insights.comparison.hobbies.subtitle': string;
  'insights.comparison.hobbies.noData': string;
  'insights.comparison.hobbies.requiresEntities': string;
  'insights.comparison.hobbies.otherSpheres': string;
  'insights.comparison.hobbies.insight.moreHobbiesTime': string;
  'insights.comparison.hobbies.insight.moreOtherSpheresTime': string;
  'insights.comparison.hobbies.insight.balancedTime': string;
  'insights.comparison.hobbies.members.title': string;
  'insights.comparison.hobbies.members.balanced': string;
  'insights.comparison.hobbies.members.catchUp': string;
  'insights.comparison.hobbies.members.mostTime': string;
  'insights.detail.relationship.title': string;
  'insights.detail.relationship.noData': string;
  'insights.detail.relationship.memories.title': string;
  'insights.detail.relationship.memories.noData': string;
  'insights.detail.relationship.memories.more.better': string;
  'insights.detail.relationship.memories.more.worse': string;
  'insights.detail.relationship.memories.more.same': string;
  'insights.detail.relationship.memories.less.better': string;
  'insights.detail.relationship.memories.less.worse': string;
  'insights.detail.relationship.memories.less.same': string;
  'insights.detail.relationship.memories.same.better': string;
  'insights.detail.relationship.memories.same.worse': string;
  'insights.detail.relationship.memories.same.same': string;
  'insights.detail.job.title': string;
  'insights.detail.job.noData': string;
  'insights.detail.job.memories.title': string;
  'insights.detail.job.memories.noData': string;
  'insights.detail.job.memories.more.better': string;
  'insights.detail.job.memories.more.worse': string;
  'insights.detail.job.memories.more.same': string;
  'insights.detail.job.memories.less.better': string;
  'insights.detail.job.memories.less.worse': string;
  'insights.detail.job.memories.less.same': string;
  'insights.detail.job.memories.same.better': string;
  'insights.detail.job.memories.same.worse': string;
  'insights.detail.job.memories.same.same': string;
  'insights.detail.family.title': string;
  'insights.detail.family.noData': string;
  'insights.detail.family.memories.title': string;
  'insights.detail.family.memories.noData': string;
  'insights.detail.family.memories.more.better': string;
  'insights.detail.family.memories.more.worse': string;
  'insights.detail.family.memories.more.same': string;
  'insights.detail.family.memories.less.better': string;
  'insights.detail.family.memories.less.worse': string;
  'insights.detail.family.memories.less.same': string;
  'insights.detail.family.memories.same.better': string;
  'insights.detail.family.memories.same.worse': string;
  'insights.detail.family.memories.same.same': string;
  'insights.suggestion.relationships.worse': string;
  'insights.suggestion.relationships.low': string;
  'insights.suggestion.relationships.progress': string;
  'insights.suggestion.relationships.strong': string;
  'insights.suggestion.career.worse': string;
  'insights.suggestion.career.low': string;
  'insights.suggestion.career.progress': string;
  'insights.suggestion.career.strong': string;
  'insights.suggestion.family.low': string;
  'insights.suggestion.family.strong': string;
  'profile.ongoing': string;
  'profile.noMemories': string;
  'profile.oneMemory': string;
  'profile.memories': string;
  'profile.relationshipQuality': string;
  'profile.relationshipQuality.positive': string;
  'job.ongoing': string;
  'job.current': string;
  'job.noMemories': string;
  'job.oneMemory': string;
  'job.memories': string;
  'job.satisfaction': string;
  'job.satisfaction.positive': string;
  'job.addNewJob': string;
  'job.editJob.title': string;
  'job.addJob.description': string;
  'job.editJob.description': string;
  'job.editJob.manage': string;
  'job.jobTitleAndCompany': string;
  'job.jobTitleAndCompany.placeholder': string;
  'job.description.placeholder': string;
  'job.startDate': string;
  'job.startDate.select': string;
  'job.startDate.selectTitle': string;
  'job.currentJob': string;
  'job.endDate': string;
  'job.endDate.select': string;
  'job.endDate.selectTitle': string;
  'job.companyLogo': string;
  'profile.addFamilyMember.description': string;
  'profile.editFamilyMember.description': string;
  'profile.familyMember.name.required': string;
  
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
  'memory.lesson': string;
  'memory.lesson.plural': string;
  'memory.lesson.none': string;
  'memory.lesson.placeholder': string;
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
  'memory.error.atLeastOneMomentRequired': string;
  'memory.error.fillAllCloudsBeforeAdding': string;
  'memory.error.fillAllSunsBeforeAdding': string;
  'memory.error.fillAllLessonsBeforeAdding': string;
  'memory.actionSheet.edit': string;
  'memory.actionSheet.delete': string;
  'memory.remindWhy': string;
  
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
  'error.missingParameters': string;
  'error.cameraPermissionRequired': string;
  'error.imagePickFailed': string;
  
  // Subscription
  'subscription.title': string;
  'subscription.subtitle': string;
  'subscription.feature.unlimited': string;
  'subscription.feature.insights': string;
  'subscription.feature.support': string;
  'subscription.monthly.title': string;
  'subscription.monthly.period': string;
  'subscription.yearly.title': string;
  'subscription.yearly.period': string;
  'subscription.yearly.savings': string;
  'subscription.purchase': string;
  'subscription.restore': string;
  'subscription.view': string;
  'subscription.success.title': string;
  'subscription.success.message': string;
  'subscription.error.title': string;
  'subscription.error.message': string;
  'subscription.restore.success.title': string;
  'subscription.restore.success.message': string;
  'subscription.restore.error.title': string;
  'subscription.restore.error.message': string;
  'subscription.limit.title': string;
  'subscription.limit.partner': string;
  'subscription.limit.job': string;
  'subscription.limit.friend': string;
  'subscription.limit.family': string;
  'subscription.limit.hobby': string;
  
  // Notifications
  'notifications.title': string;
  'notifications.sphere.friends': string;
  'notifications.sphere.family': string;
  'notifications.sphere.relationships': string;
  'notifications.status.on': string;
  'notifications.status.off': string;
  'notifications.settings.title': string;
  'notifications.settings.turnOn': string;
  'notifications.settings.turnOnDescription': string;
  'notifications.settings.message': string;
  'notifications.settings.messagePlaceholder': string;
  'notifications.settings.frequency': string;
  'notifications.settings.frequency.daily': string;
  'notifications.settings.frequency.weekly': string;
  'notifications.settings.dayOfWeek': string;
  'notifications.settings.dayOfWeek.sun': string;
  'notifications.settings.dayOfWeek.mon': string;
  'notifications.settings.dayOfWeek.tue': string;
  'notifications.settings.dayOfWeek.wed': string;
  'notifications.settings.dayOfWeek.thu': string;
  'notifications.settings.dayOfWeek.fri': string;
  'notifications.settings.dayOfWeek.sat': string;
  'notifications.settings.time': string;
  'notifications.settings.done': string;
  'notifications.settings.sound': string;
  'notifications.settings.sound.on': string;
  'notifications.settings.sound.off': string;
  'notifications.settings.condition': string;
  'notifications.settings.condition.met': string;
  'notifications.settings.condition.notMet': string;
  'notifications.settings.condition.belowAvg': string;
  'notifications.settings.condition.noRecent': string;
  'notifications.settings.condition.lessThanJob': string;
  'notifications.settings.condition.lessThanFriendsAvg': string;
  'notifications.settings.condition.noRecentDaysPlaceholder': string;
  'notifications.settings.condition.belowAvg.title': string;
  'notifications.settings.condition.belowAvg.body': string;
  'notifications.settings.condition.noRecent.title': string;
  'notifications.settings.condition.noRecent.body': string;
  'notifications.settings.condition.lessThanJob.title': string;
  'notifications.settings.condition.lessThanJob.body': string;
  'notifications.settings.condition.lessThanFriendsAvg.title': string;
  'notifications.settings.condition.lessThanFriendsAvg.body': string;
  'notifications.settings.sphere': string;

  // Onboarding
  'onboarding.skip': string;
  'onboarding.next': string;
  'onboarding.back': string;
  'onboarding.finish': string;
  'onboarding.done': string;
  'onboarding.demo': string;
  'onboarding.of': string;
  'onboarding.intro.title': string;
  'onboarding.intro.message': string;
  'onboarding.welcome.title': string;
  'onboarding.welcome.message': string;
  'onboarding.moments.title': string;
  'onboarding.moments.message': string;
  'onboarding.lessons.title': string;
  'onboarding.lessons.message': string;
  'onboarding.insights.title': string;
  'onboarding.insights.message': string;
  'onboarding.notifications.title': string;
  'onboarding.notifications.message': string;
  'onboarding.getStarted.title': string;
  'onboarding.getStarted.message': string;

  // Settings - Help Section
  'settings.help.title': string;
  'settings.help.viewGuide': string;

  // Moment Suggestions
  'suggestions.birthday.hardTruths.0': string;
  'suggestions.birthday.hardTruths.1': string;
  'suggestions.birthday.hardTruths.2': string;
  'suggestions.birthday.goodFacts.0': string;
  'suggestions.birthday.goodFacts.1': string;
  'suggestions.birthday.goodFacts.2': string;
  'suggestions.birthday.lessons.0': string;
  'suggestions.birthday.lessons.1': string;
  'suggestions.birthday.lessons.2': string;
  'suggestions.anniversary.hardTruths.0': string;
  'suggestions.anniversary.hardTruths.1': string;
  'suggestions.anniversary.hardTruths.2': string;
  'suggestions.anniversary.goodFacts.0': string;
  'suggestions.anniversary.goodFacts.1': string;
  'suggestions.anniversary.goodFacts.2': string;
  'suggestions.anniversary.lessons.0': string;
  'suggestions.anniversary.lessons.1': string;
  'suggestions.anniversary.lessons.2': string;
  'suggestions.breakup.hardTruths.0': string;
  'suggestions.breakup.hardTruths.1': string;
  'suggestions.breakup.hardTruths.2': string;
  'suggestions.breakup.goodFacts.0': string;
  'suggestions.breakup.goodFacts.1': string;
  'suggestions.breakup.goodFacts.2': string;
  'suggestions.breakup.lessons.0': string;
  'suggestions.breakup.lessons.1': string;
  'suggestions.breakup.lessons.2': string;
  'suggestions.wedding.hardTruths.0': string;
  'suggestions.wedding.hardTruths.1': string;
  'suggestions.wedding.hardTruths.2': string;
  'suggestions.wedding.goodFacts.0': string;
  'suggestions.wedding.goodFacts.1': string;
  'suggestions.wedding.goodFacts.2': string;
  'suggestions.wedding.lessons.0': string;
  'suggestions.wedding.lessons.1': string;
  'suggestions.wedding.lessons.2': string;
  'suggestions.holiday.hardTruths.0': string;
  'suggestions.holiday.hardTruths.1': string;
  'suggestions.holiday.hardTruths.2': string;
  'suggestions.holiday.goodFacts.0': string;
  'suggestions.holiday.goodFacts.1': string;
  'suggestions.holiday.goodFacts.2': string;
  'suggestions.holiday.lessons.0': string;
  'suggestions.holiday.lessons.1': string;
  'suggestions.holiday.lessons.2': string;
  'suggestions.christmas.hardTruths.0': string;
  'suggestions.christmas.hardTruths.1': string;
  'suggestions.christmas.hardTruths.2': string;
  'suggestions.christmas.goodFacts.0': string;
  'suggestions.christmas.goodFacts.1': string;
  'suggestions.christmas.goodFacts.2': string;
  'suggestions.christmas.lessons.0': string;
  'suggestions.christmas.lessons.1': string;
  'suggestions.christmas.lessons.2': string;
  'suggestions.vacation.hardTruths.0': string;
  'suggestions.vacation.hardTruths.1': string;
  'suggestions.vacation.hardTruths.2': string;
  'suggestions.vacation.goodFacts.0': string;
  'suggestions.vacation.goodFacts.1': string;
  'suggestions.vacation.goodFacts.2': string;
  'suggestions.vacation.lessons.0': string;
  'suggestions.vacation.lessons.1': string;
  'suggestions.vacation.lessons.2': string;
  'suggestions.trip.hardTruths.0': string;
  'suggestions.trip.hardTruths.1': string;
  'suggestions.trip.hardTruths.2': string;
  'suggestions.trip.goodFacts.0': string;
  'suggestions.trip.goodFacts.1': string;
  'suggestions.trip.goodFacts.2': string;
  'suggestions.trip.lessons.0': string;
  'suggestions.trip.lessons.1': string;
  'suggestions.trip.lessons.2': string;
  'suggestions.walk.hardTruths.0': string;
  'suggestions.walk.hardTruths.1': string;
  'suggestions.walk.hardTruths.2': string;
  'suggestions.walk.goodFacts.0': string;
  'suggestions.walk.goodFacts.1': string;
  'suggestions.walk.goodFacts.2': string;
  'suggestions.walk.lessons.0': string;
  'suggestions.walk.lessons.1': string;
  'suggestions.walk.lessons.2': string;
  'suggestions.mountain.hardTruths.0': string;
  'suggestions.mountain.hardTruths.1': string;
  'suggestions.mountain.hardTruths.2': string;
  'suggestions.mountain.goodFacts.0': string;
  'suggestions.mountain.goodFacts.1': string;
  'suggestions.mountain.goodFacts.2': string;
  'suggestions.mountain.lessons.0': string;
  'suggestions.mountain.lessons.1': string;
  'suggestions.mountain.lessons.2': string;
  'suggestions.lake.hardTruths.0': string;
  'suggestions.lake.hardTruths.1': string;
  'suggestions.lake.hardTruths.2': string;
  'suggestions.lake.goodFacts.0': string;
  'suggestions.lake.goodFacts.1': string;
  'suggestions.lake.goodFacts.2': string;
  'suggestions.lake.lessons.0': string;
  'suggestions.lake.lessons.1': string;
  'suggestions.lake.lessons.2': string;
  'suggestions.sand.hardTruths.0': string;
  'suggestions.sand.hardTruths.1': string;
  'suggestions.sand.hardTruths.2': string;
  'suggestions.sand.goodFacts.0': string;
  'suggestions.sand.goodFacts.1': string;
  'suggestions.sand.goodFacts.2': string;
  'suggestions.sand.lessons.0': string;
  'suggestions.sand.lessons.1': string;
  'suggestions.sand.lessons.2': string;
  'suggestions.work.hardTruths.0': string;
  'suggestions.work.hardTruths.1': string;
  'suggestions.work.hardTruths.2': string;
  'suggestions.work.goodFacts.0': string;
  'suggestions.work.goodFacts.1': string;
  'suggestions.work.goodFacts.2': string;
  'suggestions.work.lessons.0': string;
  'suggestions.work.lessons.1': string;
  'suggestions.work.lessons.2': string;
  'suggestions.family.hardTruths.0': string;
  'suggestions.family.hardTruths.1': string;
  'suggestions.family.hardTruths.2': string;
  'suggestions.family.goodFacts.0': string;
  'suggestions.family.goodFacts.1': string;
  'suggestions.family.goodFacts.2': string;
  'suggestions.family.lessons.0': string;
  'suggestions.family.lessons.1': string;
  'suggestions.family.lessons.2': string;
  'suggestions.move.hardTruths.0': string;
  'suggestions.move.hardTruths.1': string;
  'suggestions.move.hardTruths.2': string;
  'suggestions.move.goodFacts.0': string;
  'suggestions.move.goodFacts.1': string;
  'suggestions.move.goodFacts.2': string;
  'suggestions.move.lessons.0': string;
  'suggestions.move.lessons.1': string;
  'suggestions.move.lessons.2': string;
  'suggestions.fight.hardTruths.0': string;
  'suggestions.fight.hardTruths.1': string;
  'suggestions.fight.hardTruths.2': string;
  'suggestions.fight.goodFacts.0': string;
  'suggestions.fight.goodFacts.1': string;
  'suggestions.fight.goodFacts.2': string;
  'suggestions.fight.lessons.0': string;
  'suggestions.fight.lessons.1': string;
  'suggestions.fight.lessons.2': string;
  'suggestions.trust.hardTruths.0': string;
  'suggestions.trust.hardTruths.1': string;
  'suggestions.trust.hardTruths.2': string;
  'suggestions.trust.goodFacts.0': string;
  'suggestions.trust.goodFacts.1': string;
  'suggestions.trust.goodFacts.2': string;
  'suggestions.trust.lessons.0': string;
  'suggestions.trust.lessons.1': string;
  'suggestions.trust.lessons.2': string;
  'suggestions.cheat.hardTruths.0': string;
  'suggestions.cheat.hardTruths.1': string;
  'suggestions.cheat.hardTruths.2': string;
  'suggestions.cheat.goodFacts.0': string;
  'suggestions.cheat.goodFacts.1': string;
  'suggestions.cheat.goodFacts.2': string;
  'suggestions.cheat.lessons.0': string;
  'suggestions.cheat.lessons.1': string;
  'suggestions.cheat.lessons.2': string;
  'suggestions.lie.hardTruths.0': string;
  'suggestions.lie.hardTruths.1': string;
  'suggestions.lie.hardTruths.2': string;
  'suggestions.lie.goodFacts.0': string;
  'suggestions.lie.goodFacts.1': string;
  'suggestions.lie.goodFacts.2': string;
  'suggestions.lie.lessons.0': string;
  'suggestions.lie.lessons.1': string;
  'suggestions.lie.lessons.2': string;
  'suggestions.friend.hardTruths.0': string;
  'suggestions.friend.hardTruths.1': string;
  'suggestions.friend.hardTruths.2': string;
  'suggestions.friend.goodFacts.0': string;
  'suggestions.friend.goodFacts.1': string;
  'suggestions.friend.goodFacts.2': string;
  'suggestions.friend.lessons.0': string;
  'suggestions.friend.lessons.1': string;
  'suggestions.friend.lessons.2': string;
  'suggestions.pet.hardTruths.0': string;
  'suggestions.pet.hardTruths.1': string;
  'suggestions.pet.hardTruths.2': string;
  'suggestions.pet.goodFacts.0': string;
  'suggestions.pet.goodFacts.1': string;
  'suggestions.pet.goodFacts.2': string;
  'suggestions.pet.lessons.0': string;
  'suggestions.pet.lessons.1': string;
  'suggestions.pet.lessons.2': string;
  'suggestions.home.hardTruths.0': string;
  'suggestions.home.hardTruths.1': string;
  'suggestions.home.hardTruths.2': string;
  'suggestions.home.goodFacts.0': string;
  'suggestions.home.goodFacts.1': string;
  'suggestions.home.goodFacts.2': string;
  'suggestions.home.lessons.0': string;
  'suggestions.home.lessons.1': string;
  'suggestions.home.lessons.2': string;
  'suggestions.money.hardTruths.0': string;
  'suggestions.money.hardTruths.1': string;
  'suggestions.money.hardTruths.2': string;
  'suggestions.money.goodFacts.0': string;
  'suggestions.money.goodFacts.1': string;
  'suggestions.money.goodFacts.2': string;
  'suggestions.money.lessons.0': string;
  'suggestions.money.lessons.1': string;
  'suggestions.money.lessons.2': string;
  'suggestions.apology.hardTruths.0': string;
  'suggestions.apology.hardTruths.1': string;
  'suggestions.apology.hardTruths.2': string;
  'suggestions.apology.goodFacts.0': string;
  'suggestions.apology.goodFacts.1': string;
  'suggestions.apology.goodFacts.2': string;
  'suggestions.apology.lessons.0': string;
  'suggestions.apology.lessons.1': string;
  'suggestions.apology.lessons.2': string;
  'suggestions.promise.hardTruths.0': string;
  'suggestions.promise.hardTruths.1': string;
  'suggestions.promise.hardTruths.2': string;
  'suggestions.promise.goodFacts.0': string;
  'suggestions.promise.goodFacts.1': string;
  'suggestions.promise.goodFacts.2': string;
  'suggestions.promise.lessons.0': string;
  'suggestions.promise.lessons.1': string;
  'suggestions.promise.lessons.2': string;
  'suggestions.graduation.hardTruths.0': string;
  'suggestions.graduation.hardTruths.1': string;
  'suggestions.graduation.hardTruths.2': string;
  'suggestions.graduation.goodFacts.0': string;
  'suggestions.graduation.goodFacts.1': string;
  'suggestions.graduation.goodFacts.2': string;
  'suggestions.graduation.lessons.0': string;
  'suggestions.graduation.lessons.1': string;
  'suggestions.graduation.lessons.2': string;
  'suggestions.promotion.hardTruths.0': string;
  'suggestions.promotion.hardTruths.1': string;
  'suggestions.promotion.hardTruths.2': string;
  'suggestions.promotion.goodFacts.0': string;
  'suggestions.promotion.goodFacts.1': string;
  'suggestions.promotion.goodFacts.2': string;
  'suggestions.promotion.lessons.0': string;
  'suggestions.promotion.lessons.1': string;
  'suggestions.promotion.lessons.2': string;
  'suggestions.illness.hardTruths.0': string;
  'suggestions.illness.hardTruths.1': string;
  'suggestions.illness.hardTruths.2': string;
  'suggestions.illness.goodFacts.0': string;
  'suggestions.illness.goodFacts.1': string;
  'suggestions.illness.goodFacts.2': string;
  'suggestions.illness.lessons.0': string;
  'suggestions.illness.lessons.1': string;
  'suggestions.illness.lessons.2': string;
  'suggestions.hospital.hardTruths.0': string;
  'suggestions.hospital.hardTruths.1': string;
  'suggestions.hospital.hardTruths.2': string;
  'suggestions.hospital.goodFacts.0': string;
  'suggestions.hospital.goodFacts.1': string;
  'suggestions.hospital.goodFacts.2': string;
  'suggestions.hospital.lessons.0': string;
  'suggestions.hospital.lessons.1': string;
  'suggestions.hospital.lessons.2': string;
  'suggestions.concert.hardTruths.0': string;
  'suggestions.concert.hardTruths.1': string;
  'suggestions.concert.hardTruths.2': string;
  'suggestions.concert.goodFacts.0': string;
  'suggestions.concert.goodFacts.1': string;
  'suggestions.concert.goodFacts.2': string;
  'suggestions.concert.lessons.0': string;
  'suggestions.concert.lessons.1': string;
  'suggestions.concert.lessons.2': string;
  'suggestions.restaurant.hardTruths.0': string;
  'suggestions.restaurant.hardTruths.1': string;
  'suggestions.restaurant.hardTruths.2': string;
  'suggestions.restaurant.goodFacts.0': string;
  'suggestions.restaurant.goodFacts.1': string;
  'suggestions.restaurant.goodFacts.2': string;
  'suggestions.restaurant.lessons.0': string;
  'suggestions.restaurant.lessons.1': string;
  'suggestions.restaurant.lessons.2': string;
  'suggestions.date.hardTruths.0': string;
  'suggestions.date.hardTruths.1': string;
  'suggestions.date.hardTruths.2': string;
  'suggestions.date.goodFacts.0': string;
  'suggestions.date.goodFacts.1': string;
  'suggestions.date.goodFacts.2': string;
  'suggestions.date.lessons.0': string;
  'suggestions.date.lessons.1': string;
  'suggestions.date.lessons.2': string;
  'suggestions.gift.hardTruths.0': string;
  'suggestions.gift.hardTruths.1': string;
  'suggestions.gift.hardTruths.2': string;
  'suggestions.gift.goodFacts.0': string;
  'suggestions.gift.goodFacts.1': string;
  'suggestions.gift.goodFacts.2': string;
  'suggestions.gift.lessons.0': string;
  'suggestions.gift.lessons.1': string;
  'suggestions.gift.lessons.2': string;
  'suggestions.text.hardTruths.0': string;
  'suggestions.text.hardTruths.1': string;
  'suggestions.text.hardTruths.2': string;
  'suggestions.text.goodFacts.0': string;
  'suggestions.text.goodFacts.1': string;
  'suggestions.text.goodFacts.2': string;
  'suggestions.text.lessons.0': string;
  'suggestions.text.lessons.1': string;
  'suggestions.text.lessons.2': string;
  'suggestions.call.hardTruths.0': string;
  'suggestions.call.hardTruths.1': string;
  'suggestions.call.hardTruths.2': string;
  'suggestions.call.goodFacts.0': string;
  'suggestions.call.goodFacts.1': string;
  'suggestions.call.goodFacts.2': string;
  'suggestions.call.lessons.0': string;
  'suggestions.call.lessons.1': string;
  'suggestions.call.lessons.2': string;
  'suggestions.party.hardTruths.0': string;
  'suggestions.party.hardTruths.1': string;
  'suggestions.party.hardTruths.2': string;
  'suggestions.party.goodFacts.0': string;
  'suggestions.party.goodFacts.1': string;
  'suggestions.party.goodFacts.2': string;
  'suggestions.party.lessons.0': string;
  'suggestions.party.lessons.1': string;
  'suggestions.party.lessons.2': string;
  'suggestions.coffee.hardTruths.0': string;
  'suggestions.coffee.hardTruths.1': string;
  'suggestions.coffee.hardTruths.2': string;
  'suggestions.coffee.goodFacts.0': string;
  'suggestions.coffee.goodFacts.1': string;
  'suggestions.coffee.goodFacts.2': string;
  'suggestions.coffee.lessons.0': string;
  'suggestions.coffee.lessons.1': string;
  'suggestions.coffee.lessons.2': string;
  'suggestions.school.hardTruths.0': string;
  'suggestions.school.hardTruths.1': string;
  'suggestions.school.hardTruths.2': string;
  'suggestions.school.goodFacts.0': string;
  'suggestions.school.goodFacts.1': string;
  'suggestions.school.goodFacts.2': string;
  'suggestions.school.lessons.0': string;
  'suggestions.school.lessons.1': string;
  'suggestions.school.lessons.2': string;
  'suggestions.gym.hardTruths.0': string;
  'suggestions.gym.hardTruths.1': string;
  'suggestions.gym.hardTruths.2': string;
  'suggestions.gym.goodFacts.0': string;
  'suggestions.gym.goodFacts.1': string;
  'suggestions.gym.goodFacts.2': string;
  'suggestions.gym.lessons.0': string;
  'suggestions.gym.lessons.1': string;
  'suggestions.gym.lessons.2': string;
  'suggestions.music.hardTruths.0': string;
  'suggestions.music.hardTruths.1': string;
  'suggestions.music.hardTruths.2': string;
  'suggestions.music.goodFacts.0': string;
  'suggestions.music.goodFacts.1': string;
  'suggestions.music.goodFacts.2': string;
  'suggestions.music.lessons.0': string;
  'suggestions.music.lessons.1': string;
  'suggestions.music.lessons.2': string;
  'suggestions.movie.hardTruths.0': string;
  'suggestions.movie.hardTruths.1': string;
  'suggestions.movie.hardTruths.2': string;
  'suggestions.movie.goodFacts.0': string;
  'suggestions.movie.goodFacts.1': string;
  'suggestions.movie.goodFacts.2': string;
  'suggestions.movie.lessons.0': string;
  'suggestions.movie.lessons.1': string;
  'suggestions.movie.lessons.2': string;
  'suggestions.photo.hardTruths.0': string;
  'suggestions.photo.hardTruths.1': string;
  'suggestions.photo.hardTruths.2': string;
  'suggestions.photo.goodFacts.0': string;
  'suggestions.photo.goodFacts.1': string;
  'suggestions.photo.goodFacts.2': string;
  'suggestions.photo.lessons.0': string;
  'suggestions.photo.lessons.1': string;
  'suggestions.photo.lessons.2': string;
  'suggestions.travel.hardTruths.0': string;
  'suggestions.travel.hardTruths.1': string;
  'suggestions.travel.hardTruths.2': string;
  'suggestions.travel.goodFacts.0': string;
  'suggestions.travel.goodFacts.1': string;
  'suggestions.travel.goodFacts.2': string;
  'suggestions.travel.lessons.0': string;
  'suggestions.travel.lessons.1': string;
  'suggestions.travel.lessons.2': string;
  'suggestions.airport.hardTruths.0': string;
  'suggestions.airport.hardTruths.1': string;
  'suggestions.airport.hardTruths.2': string;
  'suggestions.airport.goodFacts.0': string;
  'suggestions.airport.goodFacts.1': string;
  'suggestions.airport.goodFacts.2': string;
  'suggestions.airport.lessons.0': string;
  'suggestions.airport.lessons.1': string;
  'suggestions.airport.lessons.2': string;
  'suggestions.beach.hardTruths.0': string;
  'suggestions.beach.hardTruths.1': string;
  'suggestions.beach.hardTruths.2': string;
  'suggestions.beach.goodFacts.0': string;
  'suggestions.beach.goodFacts.1': string;
  'suggestions.beach.goodFacts.2': string;
  'suggestions.beach.lessons.0': string;
  'suggestions.beach.lessons.1': string;
  'suggestions.beach.lessons.2': string;
  'suggestions.park.hardTruths.0': string;
  'suggestions.park.hardTruths.1': string;
  'suggestions.park.hardTruths.2': string;
  'suggestions.park.goodFacts.0': string;
  'suggestions.park.goodFacts.1': string;
  'suggestions.park.goodFacts.2': string;
  'suggestions.park.lessons.0': string;
  'suggestions.park.lessons.1': string;
  'suggestions.park.lessons.2': string;
  'suggestions.shopping.hardTruths.0': string;
  'suggestions.shopping.hardTruths.1': string;
  'suggestions.shopping.hardTruths.2': string;
  'suggestions.shopping.goodFacts.0': string;
  'suggestions.shopping.goodFacts.1': string;
  'suggestions.shopping.goodFacts.2': string;
  'suggestions.shopping.lessons.0': string;
  'suggestions.shopping.lessons.1': string;
  'suggestions.shopping.lessons.2': string;
  'suggestions.car.hardTruths.0': string;
  'suggestions.car.hardTruths.1': string;
  'suggestions.car.hardTruths.2': string;
  'suggestions.car.goodFacts.0': string;
  'suggestions.car.goodFacts.1': string;
  'suggestions.car.goodFacts.2': string;
  'suggestions.car.lessons.0': string;
  'suggestions.car.lessons.1': string;
  'suggestions.car.lessons.2': string;
  'suggestions.game.hardTruths.0': string;
  'suggestions.game.hardTruths.1': string;
  'suggestions.game.hardTruths.2': string;
  'suggestions.game.goodFacts.0': string;
  'suggestions.game.goodFacts.1': string;
  'suggestions.game.goodFacts.2': string;
  'suggestions.game.lessons.0': string;
  'suggestions.game.lessons.1': string;
  'suggestions.game.lessons.2': string;
  'suggestions.default.hardTruths.0': string;
  'suggestions.default.hardTruths.1': string;
  'suggestions.default.hardTruths.2': string;
  'suggestions.default.goodFacts.0': string;
  'suggestions.default.goodFacts.1': string;
  'suggestions.default.goodFacts.2': string;
  'suggestions.default.lessons.0': string;
  'suggestions.default.lessons.1': string;
  'suggestions.default.lessons.2': string;
  'suggestions.kiss.hardTruths.0': string;
  'suggestions.kiss.hardTruths.1': string;
  'suggestions.kiss.hardTruths.2': string;
  'suggestions.kiss.goodFacts.0': string;
  'suggestions.kiss.goodFacts.1': string;
  'suggestions.kiss.goodFacts.2': string;
  'suggestions.kiss.lessons.0': string;
  'suggestions.kiss.lessons.1': string;
  'suggestions.kiss.lessons.2': string;
  'suggestions.hug.hardTruths.0': string;
  'suggestions.hug.hardTruths.1': string;
  'suggestions.hug.hardTruths.2': string;
  'suggestions.hug.goodFacts.0': string;
  'suggestions.hug.goodFacts.1': string;
  'suggestions.hug.goodFacts.2': string;
  'suggestions.hug.lessons.0': string;
  'suggestions.hug.lessons.1': string;
  'suggestions.hug.lessons.2': string;
  'suggestions.cuddle.hardTruths.0': string;
  'suggestions.cuddle.hardTruths.1': string;
  'suggestions.cuddle.hardTruths.2': string;
  'suggestions.cuddle.goodFacts.0': string;
  'suggestions.cuddle.goodFacts.1': string;
  'suggestions.cuddle.goodFacts.2': string;
  'suggestions.cuddle.lessons.0': string;
  'suggestions.cuddle.lessons.1': string;
  'suggestions.cuddle.lessons.2': string;
  'suggestions.morning.hardTruths.0': string;
  'suggestions.morning.hardTruths.1': string;
  'suggestions.morning.hardTruths.2': string;
  'suggestions.morning.goodFacts.0': string;
  'suggestions.morning.goodFacts.1': string;
  'suggestions.morning.goodFacts.2': string;
  'suggestions.morning.lessons.0': string;
  'suggestions.morning.lessons.1': string;
  'suggestions.morning.lessons.2': string;
  'suggestions.night.hardTruths.0': string;
  'suggestions.night.hardTruths.1': string;
  'suggestions.night.hardTruths.2': string;
  'suggestions.night.goodFacts.0': string;
  'suggestions.night.goodFacts.1': string;
  'suggestions.night.goodFacts.2': string;
  'suggestions.night.lessons.0': string;
  'suggestions.night.lessons.1': string;
  'suggestions.night.lessons.2': string;
  'suggestions.weekend.hardTruths.0': string;
  'suggestions.weekend.hardTruths.1': string;
  'suggestions.weekend.hardTruths.2': string;
  'suggestions.weekend.goodFacts.0': string;
  'suggestions.weekend.goodFacts.1': string;
  'suggestions.weekend.goodFacts.2': string;
  'suggestions.weekend.lessons.0': string;
  'suggestions.weekend.lessons.1': string;
  'suggestions.weekend.lessons.2': string;
  'suggestions.sunset.hardTruths.0': string;
  'suggestions.sunset.hardTruths.1': string;
  'suggestions.sunset.hardTruths.2': string;
  'suggestions.sunset.goodFacts.0': string;
  'suggestions.sunset.goodFacts.1': string;
  'suggestions.sunset.goodFacts.2': string;
  'suggestions.sunset.lessons.0': string;
  'suggestions.sunset.lessons.1': string;
  'suggestions.sunset.lessons.2': string;
  'suggestions.sunrise.hardTruths.0': string;
  'suggestions.sunrise.hardTruths.1': string;
  'suggestions.sunrise.hardTruths.2': string;
  'suggestions.sunrise.goodFacts.0': string;
  'suggestions.sunrise.goodFacts.1': string;
  'suggestions.sunrise.goodFacts.2': string;
  'suggestions.sunrise.lessons.0': string;
  'suggestions.sunrise.lessons.1': string;
  'suggestions.sunrise.lessons.2': string;
  'suggestions.rain.hardTruths.0': string;
  'suggestions.rain.hardTruths.1': string;
  'suggestions.rain.hardTruths.2': string;
  'suggestions.rain.goodFacts.0': string;
  'suggestions.rain.goodFacts.1': string;
  'suggestions.rain.goodFacts.2': string;
  'suggestions.rain.lessons.0': string;
  'suggestions.rain.lessons.1': string;
  'suggestions.rain.lessons.2': string;
  'suggestions.snow.hardTruths.0': string;
  'suggestions.snow.hardTruths.1': string;
  'suggestions.snow.hardTruths.2': string;
  'suggestions.snow.goodFacts.0': string;
  'suggestions.snow.goodFacts.1': string;
  'suggestions.snow.goodFacts.2': string;
  'suggestions.snow.lessons.0': string;
  'suggestions.snow.lessons.1': string;
  'suggestions.snow.lessons.2': string;
  'suggestions.storm.hardTruths.0': string;
  'suggestions.storm.hardTruths.1': string;
  'suggestions.storm.hardTruths.2': string;
  'suggestions.storm.goodFacts.0': string;
  'suggestions.storm.goodFacts.1': string;
  'suggestions.storm.goodFacts.2': string;
  'suggestions.storm.lessons.0': string;
  'suggestions.storm.lessons.1': string;
  'suggestions.storm.lessons.2': string;
  'suggestions.breakfast.hardTruths.0': string;
  'suggestions.breakfast.hardTruths.1': string;
  'suggestions.breakfast.hardTruths.2': string;
  'suggestions.breakfast.goodFacts.0': string;
  'suggestions.breakfast.goodFacts.1': string;
  'suggestions.breakfast.goodFacts.2': string;
  'suggestions.breakfast.lessons.0': string;
  'suggestions.breakfast.lessons.1': string;
  'suggestions.breakfast.lessons.2': string;
  'suggestions.dinner.hardTruths.0': string;
  'suggestions.dinner.hardTruths.1': string;
  'suggestions.dinner.hardTruths.2': string;
  'suggestions.dinner.goodFacts.0': string;
  'suggestions.dinner.goodFacts.1': string;
  'suggestions.dinner.goodFacts.2': string;
  'suggestions.dinner.lessons.0': string;
  'suggestions.dinner.lessons.1': string;
  'suggestions.dinner.lessons.2': string;
  'suggestions.email.hardTruths.0': string;
  'suggestions.email.hardTruths.1': string;
  'suggestions.email.hardTruths.2': string;
  'suggestions.email.goodFacts.0': string;
  'suggestions.email.goodFacts.1': string;
  'suggestions.email.goodFacts.2': string;
  'suggestions.email.lessons.0': string;
  'suggestions.email.lessons.1': string;
  'suggestions.email.lessons.2': string;
  'suggestions.video.hardTruths.0': string;
  'suggestions.video.hardTruths.1': string;
  'suggestions.video.hardTruths.2': string;
  'suggestions.video.goodFacts.0': string;
  'suggestions.video.goodFacts.1': string;
  'suggestions.video.goodFacts.2': string;
  'suggestions.video.lessons.0': string;
  'suggestions.video.lessons.1': string;
  'suggestions.video.lessons.2': string;
  'suggestions.spring.hardTruths.0': string;
  'suggestions.spring.hardTruths.1': string;
  'suggestions.spring.hardTruths.2': string;
  'suggestions.spring.goodFacts.0': string;
  'suggestions.spring.goodFacts.1': string;
  'suggestions.spring.goodFacts.2': string;
  'suggestions.spring.lessons.0': string;
  'suggestions.spring.lessons.1': string;
  'suggestions.spring.lessons.2': string;
  'suggestions.summer.hardTruths.0': string;
  'suggestions.summer.hardTruths.1': string;
  'suggestions.summer.hardTruths.2': string;
  'suggestions.summer.goodFacts.0': string;
  'suggestions.summer.goodFacts.1': string;
  'suggestions.summer.goodFacts.2': string;
  'suggestions.summer.lessons.0': string;
  'suggestions.summer.lessons.1': string;
  'suggestions.summer.lessons.2': string;
  'suggestions.winter.hardTruths.0': string;
  'suggestions.winter.hardTruths.1': string;
  'suggestions.winter.hardTruths.2': string;
  'suggestions.winter.goodFacts.0': string;
  'suggestions.winter.goodFacts.1': string;
  'suggestions.winter.goodFacts.2': string;
  'suggestions.winter.lessons.0': string;
  'suggestions.winter.lessons.1': string;
  'suggestions.winter.lessons.2': string;
  'suggestions.autumn.hardTruths.0': string;
  'suggestions.autumn.hardTruths.1': string;
  'suggestions.autumn.hardTruths.2': string;
  'suggestions.autumn.goodFacts.0': string;
  'suggestions.autumn.goodFacts.1': string;
  'suggestions.autumn.goodFacts.2': string;
  'suggestions.autumn.lessons.0': string;
  'suggestions.autumn.lessons.1': string;
  'suggestions.autumn.lessons.2': string;
  'suggestions.goodbye.hardTruths.0': string;
  'suggestions.goodbye.hardTruths.1': string;
  'suggestions.goodbye.hardTruths.2': string;
  'suggestions.goodbye.goodFacts.0': string;
  'suggestions.goodbye.goodFacts.1': string;
  'suggestions.goodbye.goodFacts.2': string;
  'suggestions.goodbye.lessons.0': string;
  'suggestions.goodbye.lessons.1': string;
  'suggestions.goodbye.lessons.2': string;
  'suggestions.first.hardTruths.0': string;
  'suggestions.first.hardTruths.1': string;
  'suggestions.first.hardTruths.2': string;
  'suggestions.first.goodFacts.0': string;
  'suggestions.first.goodFacts.1': string;
  'suggestions.first.goodFacts.2': string;
  'suggestions.first.lessons.0': string;
  'suggestions.first.lessons.1': string;
  'suggestions.first.lessons.2': string;
  'suggestions.last.hardTruths.0': string;
  'suggestions.last.hardTruths.1': string;
  'suggestions.last.hardTruths.2': string;
  'suggestions.last.goodFacts.0': string;
  'suggestions.last.goodFacts.1': string;
  'suggestions.last.goodFacts.2': string;
  'suggestions.last.lessons.0': string;
  'suggestions.last.lessons.1': string;
  'suggestions.last.lessons.2': string;
  'suggestions.together.hardTruths.0': string;
  'suggestions.together.hardTruths.1': string;
  'suggestions.together.hardTruths.2': string;
  'suggestions.together.goodFacts.0': string;
  'suggestions.together.goodFacts.1': string;
  'suggestions.together.goodFacts.2': string;
  'suggestions.together.lessons.0': string;
  'suggestions.together.lessons.1': string;
  'suggestions.together.lessons.2': string;
  'suggestions.dream.hardTruths.0': string;
  'suggestions.dream.hardTruths.1': string;
  'suggestions.dream.hardTruths.2': string;
  'suggestions.dream.goodFacts.0': string;
  'suggestions.dream.goodFacts.1': string;
  'suggestions.dream.goodFacts.2': string;
  'suggestions.dream.lessons.0': string;
  'suggestions.dream.lessons.1': string;
  'suggestions.dream.lessons.2': string;
  'suggestions.laugh.hardTruths.0': string;
  'suggestions.laugh.hardTruths.1': string;
  'suggestions.laugh.hardTruths.2': string;
  'suggestions.laugh.goodFacts.0': string;
  'suggestions.laugh.goodFacts.1': string;
  'suggestions.laugh.goodFacts.2': string;
  'suggestions.laugh.lessons.0': string;
  'suggestions.laugh.lessons.1': string;
  'suggestions.laugh.lessons.2': string;
  'suggestions.proposal.hardTruths.0': string;
  'suggestions.proposal.hardTruths.1': string;
  'suggestions.proposal.hardTruths.2': string;
  'suggestions.proposal.goodFacts.0': string;
  'suggestions.proposal.goodFacts.1': string;
  'suggestions.proposal.goodFacts.2': string;
  'suggestions.proposal.lessons.0': string;
  'suggestions.proposal.lessons.1': string;
  'suggestions.proposal.lessons.2': string;
  'suggestions.engagement.hardTruths.0': string;
  'suggestions.engagement.hardTruths.1': string;
  'suggestions.engagement.hardTruths.2': string;
  'suggestions.engagement.goodFacts.0': string;
  'suggestions.engagement.goodFacts.1': string;
  'suggestions.engagement.goodFacts.2': string;
  'suggestions.engagement.lessons.0': string;
  'suggestions.engagement.lessons.1': string;
  'suggestions.engagement.lessons.2': string;
  'suggestions.ring.hardTruths.0': string;
  'suggestions.ring.hardTruths.1': string;
  'suggestions.ring.hardTruths.2': string;
  'suggestions.ring.goodFacts.0': string;
  'suggestions.ring.goodFacts.1': string;
  'suggestions.ring.goodFacts.2': string;
  'suggestions.ring.lessons.0': string;
  'suggestions.ring.lessons.1': string;
  'suggestions.ring.lessons.2': string;
  'suggestions.divorce.hardTruths.0': string;
  'suggestions.divorce.hardTruths.1': string;
  'suggestions.divorce.hardTruths.2': string;
  'suggestions.divorce.goodFacts.0': string;
  'suggestions.divorce.goodFacts.1': string;
  'suggestions.divorce.goodFacts.2': string;
  'suggestions.divorce.lessons.0': string;
  'suggestions.divorce.lessons.1': string;
  'suggestions.divorce.lessons.2': string;
  'suggestions.love.hardTruths.0': string;
  'suggestions.love.hardTruths.1': string;
  'suggestions.love.hardTruths.2': string;
  'suggestions.love.goodFacts.0': string;
  'suggestions.love.goodFacts.1': string;
  'suggestions.love.goodFacts.2': string;
  'suggestions.love.lessons.0': string;
  'suggestions.love.lessons.1': string;
  'suggestions.love.lessons.2': string;
  'suggestions.interview.hardTruths.0': string;
  'suggestions.interview.hardTruths.1': string;
  'suggestions.interview.hardTruths.2': string;
  'suggestions.interview.goodFacts.0': string;
  'suggestions.interview.goodFacts.1': string;
  'suggestions.interview.goodFacts.2': string;
  'suggestions.interview.lessons.0': string;
  'suggestions.interview.lessons.1': string;
  'suggestions.interview.lessons.2': string;
  'suggestions.meeting.hardTruths.0': string;
  'suggestions.meeting.hardTruths.1': string;
  'suggestions.meeting.hardTruths.2': string;
  'suggestions.meeting.goodFacts.0': string;
  'suggestions.meeting.goodFacts.1': string;
  'suggestions.meeting.goodFacts.2': string;
  'suggestions.meeting.lessons.0': string;
  'suggestions.meeting.lessons.1': string;
  'suggestions.meeting.lessons.2': string;
  'suggestions.project.hardTruths.0': string;
  'suggestions.project.hardTruths.1': string;
  'suggestions.project.hardTruths.2': string;
  'suggestions.project.goodFacts.0': string;
  'suggestions.project.goodFacts.1': string;
  'suggestions.project.goodFacts.2': string;
  'suggestions.project.lessons.0': string;
  'suggestions.project.lessons.1': string;
  'suggestions.project.lessons.2': string;
  'suggestions.office.hardTruths.0': string;
  'suggestions.office.hardTruths.1': string;
  'suggestions.office.hardTruths.2': string;
  'suggestions.office.goodFacts.0': string;
  'suggestions.office.goodFacts.1': string;
  'suggestions.office.goodFacts.2': string;
  'suggestions.office.lessons.0': string;
  'suggestions.office.lessons.1': string;
  'suggestions.office.lessons.2': string;
  'suggestions.boss.hardTruths.0': string;
  'suggestions.boss.hardTruths.1': string;
  'suggestions.boss.hardTruths.2': string;
  'suggestions.boss.goodFacts.0': string;
  'suggestions.boss.goodFacts.1': string;
  'suggestions.boss.goodFacts.2': string;
  'suggestions.boss.lessons.0': string;
  'suggestions.boss.lessons.1': string;
  'suggestions.boss.lessons.2': string;
  'suggestions.colleague.hardTruths.0': string;
  'suggestions.colleague.hardTruths.1': string;
  'suggestions.colleague.hardTruths.2': string;
  'suggestions.colleague.goodFacts.0': string;
  'suggestions.colleague.goodFacts.1': string;
  'suggestions.colleague.goodFacts.2': string;
  'suggestions.colleague.lessons.0': string;
  'suggestions.colleague.lessons.1': string;
  'suggestions.colleague.lessons.2': string;
  'suggestions.fired.hardTruths.0': string;
  'suggestions.fired.hardTruths.1': string;
  'suggestions.fired.hardTruths.2': string;
  'suggestions.fired.goodFacts.0': string;
  'suggestions.fired.goodFacts.1': string;
  'suggestions.fired.goodFacts.2': string;
  'suggestions.fired.lessons.0': string;
  'suggestions.fired.lessons.1': string;
  'suggestions.fired.lessons.2': string;
  'suggestions.parent.hardTruths.0': string;
  'suggestions.parent.hardTruths.1': string;
  'suggestions.parent.hardTruths.2': string;
  'suggestions.parent.goodFacts.0': string;
  'suggestions.parent.goodFacts.1': string;
  'suggestions.parent.goodFacts.2': string;
  'suggestions.parent.lessons.0': string;
  'suggestions.parent.lessons.1': string;
  'suggestions.parent.lessons.2': string;
  'suggestions.mother.hardTruths.0': string;
  'suggestions.mother.hardTruths.1': string;
  'suggestions.mother.hardTruths.2': string;
  'suggestions.mother.goodFacts.0': string;
  'suggestions.mother.goodFacts.1': string;
  'suggestions.mother.goodFacts.2': string;
  'suggestions.mother.lessons.0': string;
  'suggestions.mother.lessons.1': string;
  'suggestions.mother.lessons.2': string;
  'suggestions.father.hardTruths.0': string;
  'suggestions.father.hardTruths.1': string;
  'suggestions.father.hardTruths.2': string;
  'suggestions.father.goodFacts.0': string;
  'suggestions.father.goodFacts.1': string;
  'suggestions.father.goodFacts.2': string;
  'suggestions.father.lessons.0': string;
  'suggestions.father.lessons.1': string;
  'suggestions.father.lessons.2': string;
  'suggestions.sibling.hardTruths.0': string;
  'suggestions.sibling.hardTruths.1': string;
  'suggestions.sibling.hardTruths.2': string;
  'suggestions.sibling.goodFacts.0': string;
  'suggestions.sibling.goodFacts.1': string;
  'suggestions.sibling.goodFacts.2': string;
  'suggestions.sibling.lessons.0': string;
  'suggestions.sibling.lessons.1': string;
  'suggestions.sibling.lessons.2': string;
  'suggestions.child.hardTruths.0': string;
  'suggestions.child.hardTruths.1': string;
  'suggestions.child.hardTruths.2': string;
  'suggestions.child.goodFacts.0': string;
  'suggestions.child.goodFacts.1': string;
  'suggestions.child.goodFacts.2': string;
  'suggestions.child.lessons.0': string;
  'suggestions.child.lessons.1': string;
  'suggestions.child.lessons.2': string;
  'suggestions.reunion.hardTruths.0': string;
  'suggestions.reunion.hardTruths.1': string;
  'suggestions.reunion.hardTruths.2': string;
  'suggestions.reunion.goodFacts.0': string;
  'suggestions.reunion.goodFacts.1': string;
  'suggestions.reunion.goodFacts.2': string;
  'suggestions.reunion.lessons.0': string;
  'suggestions.reunion.lessons.1': string;
  'suggestions.reunion.lessons.2': string;
  'suggestions.bestfriend.hardTruths.0': string;
  'suggestions.bestfriend.hardTruths.1': string;
  'suggestions.bestfriend.hardTruths.2': string;
  'suggestions.bestfriend.goodFacts.0': string;
  'suggestions.bestfriend.goodFacts.1': string;
  'suggestions.bestfriend.goodFacts.2': string;
  'suggestions.bestfriend.lessons.0': string;
  'suggestions.bestfriend.lessons.1': string;
  'suggestions.bestfriend.lessons.2': string;
  'suggestions.hangout.hardTruths.0': string;
  'suggestions.hangout.hardTruths.1': string;
  'suggestions.hangout.hardTruths.2': string;
  'suggestions.hangout.goodFacts.0': string;
  'suggestions.hangout.goodFacts.1': string;
  'suggestions.hangout.goodFacts.2': string;
  'suggestions.hangout.lessons.0': string;
  'suggestions.hangout.lessons.1': string;
  'suggestions.hangout.lessons.2': string;
  'suggestions.sport.hardTruths.0': string;
  'suggestions.sport.hardTruths.1': string;
  'suggestions.sport.hardTruths.2': string;
  'suggestions.sport.goodFacts.0': string;
  'suggestions.sport.goodFacts.1': string;
  'suggestions.sport.goodFacts.2': string;
  'suggestions.sport.lessons.0': string;
  'suggestions.sport.lessons.1': string;
  'suggestions.sport.lessons.2': string;
  'suggestions.art.hardTruths.0': string;
  'suggestions.art.hardTruths.1': string;
  'suggestions.art.hardTruths.2': string;
  'suggestions.art.goodFacts.0': string;
  'suggestions.art.goodFacts.1': string;
  'suggestions.art.goodFacts.2': string;
  'suggestions.art.lessons.0': string;
  'suggestions.art.lessons.1': string;
  'suggestions.art.lessons.2': string;
  'suggestions.cooking.hardTruths.0': string;
  'suggestions.cooking.hardTruths.1': string;
  'suggestions.cooking.hardTruths.2': string;
  'suggestions.cooking.goodFacts.0': string;
  'suggestions.cooking.goodFacts.1': string;
  'suggestions.cooking.goodFacts.2': string;
  'suggestions.cooking.lessons.0': string;
  'suggestions.cooking.lessons.1': string;
  'suggestions.cooking.lessons.2': string;
  'suggestions.reading.hardTruths.0': string;
  'suggestions.reading.hardTruths.1': string;
  'suggestions.reading.hardTruths.2': string;
  'suggestions.reading.goodFacts.0': string;
  'suggestions.reading.goodFacts.1': string;
  'suggestions.reading.goodFacts.2': string;
  'suggestions.reading.lessons.0': string;
  'suggestions.reading.lessons.1': string;
  'suggestions.reading.lessons.2': string;
  'suggestions.writing.hardTruths.0': string;
  'suggestions.writing.hardTruths.1': string;
  'suggestions.writing.hardTruths.2': string;
  'suggestions.writing.goodFacts.0': string;
  'suggestions.writing.goodFacts.1': string;
  'suggestions.writing.goodFacts.2': string;
  'suggestions.writing.lessons.0': string;
  'suggestions.writing.lessons.1': string;
  'suggestions.writing.lessons.2': string;
  'suggestions.dance.hardTruths.0': string;
  'suggestions.dance.hardTruths.1': string;
  'suggestions.dance.hardTruths.2': string;
  'suggestions.dance.goodFacts.0': string;
  'suggestions.dance.goodFacts.1': string;
  'suggestions.dance.goodFacts.2': string;
  'suggestions.dance.lessons.0': string;
  'suggestions.dance.lessons.1': string;
  'suggestions.dance.lessons.2': string;
  'suggestions.garden.hardTruths.0': string;
  'suggestions.garden.hardTruths.1': string;
  'suggestions.garden.hardTruths.2': string;
  'suggestions.garden.goodFacts.0': string;
  'suggestions.garden.goodFacts.1': string;
  'suggestions.garden.goodFacts.2': string;
  'suggestions.garden.lessons.0': string;
  'suggestions.garden.lessons.1': string;
  'suggestions.garden.lessons.2': string;
  'suggestions.airport.hardTruths.3': string;
  'suggestions.airport.hardTruths.4': string;
  'suggestions.airport.goodFacts.3': string;
  'suggestions.airport.goodFacts.4': string;
  'suggestions.airport.lessons.3': string;
  'suggestions.airport.lessons.4': string;
  'suggestions.anniversary.hardTruths.3': string;
  'suggestions.anniversary.hardTruths.4': string;
  'suggestions.anniversary.goodFacts.3': string;
  'suggestions.anniversary.goodFacts.4': string;
  'suggestions.anniversary.lessons.3': string;
  'suggestions.anniversary.lessons.4': string;
  'suggestions.apology.hardTruths.3': string;
  'suggestions.apology.hardTruths.4': string;
  'suggestions.apology.goodFacts.3': string;
  'suggestions.apology.goodFacts.4': string;
  'suggestions.apology.lessons.3': string;
  'suggestions.apology.lessons.4': string;
  'suggestions.art.hardTruths.3': string;
  'suggestions.art.hardTruths.4': string;
  'suggestions.art.goodFacts.3': string;
  'suggestions.art.goodFacts.4': string;
  'suggestions.art.lessons.3': string;
  'suggestions.art.lessons.4': string;
  'suggestions.autumn.hardTruths.3': string;
  'suggestions.autumn.hardTruths.4': string;
  'suggestions.autumn.goodFacts.3': string;
  'suggestions.autumn.goodFacts.4': string;
  'suggestions.autumn.lessons.3': string;
  'suggestions.autumn.lessons.4': string;
  'suggestions.beach.hardTruths.3': string;
  'suggestions.beach.hardTruths.4': string;
  'suggestions.beach.goodFacts.3': string;
  'suggestions.beach.goodFacts.4': string;
  'suggestions.beach.lessons.3': string;
  'suggestions.beach.lessons.4': string;
  'suggestions.bestfriend.hardTruths.3': string;
  'suggestions.bestfriend.hardTruths.4': string;
  'suggestions.bestfriend.goodFacts.3': string;
  'suggestions.bestfriend.goodFacts.4': string;
  'suggestions.bestfriend.lessons.3': string;
  'suggestions.bestfriend.lessons.4': string;
  'suggestions.birthday.hardTruths.3': string;
  'suggestions.birthday.hardTruths.4': string;
  'suggestions.birthday.goodFacts.3': string;
  'suggestions.birthday.goodFacts.4': string;
  'suggestions.birthday.lessons.3': string;
  'suggestions.birthday.lessons.4': string;
  'suggestions.boss.hardTruths.3': string;
  'suggestions.boss.hardTruths.4': string;
  'suggestions.boss.goodFacts.3': string;
  'suggestions.boss.goodFacts.4': string;
  'suggestions.boss.lessons.3': string;
  'suggestions.boss.lessons.4': string;
  'suggestions.breakfast.hardTruths.3': string;
  'suggestions.breakfast.hardTruths.4': string;
  'suggestions.breakfast.goodFacts.3': string;
  'suggestions.breakfast.goodFacts.4': string;
  'suggestions.breakfast.lessons.3': string;
  'suggestions.breakfast.lessons.4': string;
  'suggestions.breakup.hardTruths.3': string;
  'suggestions.breakup.hardTruths.4': string;
  'suggestions.breakup.goodFacts.3': string;
  'suggestions.breakup.goodFacts.4': string;
  'suggestions.breakup.lessons.3': string;
  'suggestions.breakup.lessons.4': string;
  'suggestions.call.hardTruths.3': string;
  'suggestions.call.hardTruths.4': string;
  'suggestions.call.goodFacts.3': string;
  'suggestions.call.goodFacts.4': string;
  'suggestions.call.lessons.3': string;
  'suggestions.call.lessons.4': string;
  'suggestions.car.hardTruths.3': string;
  'suggestions.car.hardTruths.4': string;
  'suggestions.car.goodFacts.3': string;
  'suggestions.car.goodFacts.4': string;
  'suggestions.car.lessons.3': string;
  'suggestions.car.lessons.4': string;
  'suggestions.cheat.hardTruths.3': string;
  'suggestions.cheat.hardTruths.4': string;
  'suggestions.cheat.goodFacts.3': string;
  'suggestions.cheat.goodFacts.4': string;
  'suggestions.cheat.lessons.3': string;
  'suggestions.cheat.lessons.4': string;
  'suggestions.child.hardTruths.3': string;
  'suggestions.child.hardTruths.4': string;
  'suggestions.child.goodFacts.3': string;
  'suggestions.child.goodFacts.4': string;
  'suggestions.child.lessons.3': string;
  'suggestions.child.lessons.4': string;
  'suggestions.christmas.hardTruths.3': string;
  'suggestions.christmas.hardTruths.4': string;
  'suggestions.christmas.goodFacts.3': string;
  'suggestions.christmas.goodFacts.4': string;
  'suggestions.christmas.lessons.3': string;
  'suggestions.christmas.lessons.4': string;
  'suggestions.coffee.hardTruths.3': string;
  'suggestions.coffee.hardTruths.4': string;
  'suggestions.coffee.goodFacts.3': string;
  'suggestions.coffee.goodFacts.4': string;
  'suggestions.coffee.lessons.3': string;
  'suggestions.coffee.lessons.4': string;
  'suggestions.colleague.hardTruths.3': string;
  'suggestions.colleague.hardTruths.4': string;
  'suggestions.colleague.goodFacts.3': string;
  'suggestions.colleague.goodFacts.4': string;
  'suggestions.colleague.lessons.3': string;
  'suggestions.colleague.lessons.4': string;
  'suggestions.concert.hardTruths.3': string;
  'suggestions.concert.hardTruths.4': string;
  'suggestions.concert.goodFacts.3': string;
  'suggestions.concert.goodFacts.4': string;
  'suggestions.concert.lessons.3': string;
  'suggestions.concert.lessons.4': string;
  'suggestions.cooking.hardTruths.3': string;
  'suggestions.cooking.hardTruths.4': string;
  'suggestions.cooking.goodFacts.3': string;
  'suggestions.cooking.goodFacts.4': string;
  'suggestions.cooking.lessons.3': string;
  'suggestions.cooking.lessons.4': string;
  'suggestions.cuddle.hardTruths.3': string;
  'suggestions.cuddle.hardTruths.4': string;
  'suggestions.cuddle.goodFacts.3': string;
  'suggestions.cuddle.goodFacts.4': string;
  'suggestions.cuddle.lessons.3': string;
  'suggestions.cuddle.lessons.4': string;
  'suggestions.dance.hardTruths.3': string;
  'suggestions.dance.hardTruths.4': string;
  'suggestions.dance.goodFacts.3': string;
  'suggestions.dance.goodFacts.4': string;
  'suggestions.dance.lessons.3': string;
  'suggestions.dance.lessons.4': string;
  'suggestions.date.hardTruths.3': string;
  'suggestions.date.hardTruths.4': string;
  'suggestions.date.goodFacts.3': string;
  'suggestions.date.goodFacts.4': string;
  'suggestions.date.lessons.3': string;
  'suggestions.date.lessons.4': string;
  'suggestions.default.hardTruths.3': string;
  'suggestions.default.hardTruths.4': string;
  'suggestions.default.goodFacts.3': string;
  'suggestions.default.goodFacts.4': string;
  'suggestions.default.lessons.3': string;
  'suggestions.default.lessons.4': string;
  'suggestions.dinner.hardTruths.3': string;
  'suggestions.dinner.hardTruths.4': string;
  'suggestions.dinner.goodFacts.3': string;
  'suggestions.dinner.goodFacts.4': string;
  'suggestions.dinner.lessons.3': string;
  'suggestions.dinner.lessons.4': string;
  'suggestions.divorce.hardTruths.3': string;
  'suggestions.divorce.hardTruths.4': string;
  'suggestions.divorce.goodFacts.3': string;
  'suggestions.divorce.goodFacts.4': string;
  'suggestions.divorce.lessons.3': string;
  'suggestions.divorce.lessons.4': string;
  'suggestions.dream.hardTruths.3': string;
  'suggestions.dream.hardTruths.4': string;
  'suggestions.dream.goodFacts.3': string;
  'suggestions.dream.goodFacts.4': string;
  'suggestions.dream.lessons.3': string;
  'suggestions.dream.lessons.4': string;
  'suggestions.email.hardTruths.3': string;
  'suggestions.email.hardTruths.4': string;
  'suggestions.email.goodFacts.3': string;
  'suggestions.email.goodFacts.4': string;
  'suggestions.email.lessons.3': string;
  'suggestions.email.lessons.4': string;
  'suggestions.engagement.hardTruths.3': string;
  'suggestions.engagement.hardTruths.4': string;
  'suggestions.engagement.goodFacts.3': string;
  'suggestions.engagement.goodFacts.4': string;
  'suggestions.engagement.lessons.3': string;
  'suggestions.engagement.lessons.4': string;
  'suggestions.family.hardTruths.3': string;
  'suggestions.family.hardTruths.4': string;
  'suggestions.family.goodFacts.3': string;
  'suggestions.family.goodFacts.4': string;
  'suggestions.family.lessons.3': string;
  'suggestions.family.lessons.4': string;
  'suggestions.father.hardTruths.3': string;
  'suggestions.father.hardTruths.4': string;
  'suggestions.father.goodFacts.3': string;
  'suggestions.father.goodFacts.4': string;
  'suggestions.father.lessons.3': string;
  'suggestions.father.lessons.4': string;
  'suggestions.fight.hardTruths.3': string;
  'suggestions.fight.hardTruths.4': string;
  'suggestions.fight.goodFacts.3': string;
  'suggestions.fight.goodFacts.4': string;
  'suggestions.fight.lessons.3': string;
  'suggestions.fight.lessons.4': string;
  'suggestions.fired.hardTruths.3': string;
  'suggestions.fired.hardTruths.4': string;
  'suggestions.fired.goodFacts.3': string;
  'suggestions.fired.goodFacts.4': string;
  'suggestions.fired.lessons.3': string;
  'suggestions.fired.lessons.4': string;
  'suggestions.first.hardTruths.3': string;
  'suggestions.first.hardTruths.4': string;
  'suggestions.first.goodFacts.3': string;
  'suggestions.first.goodFacts.4': string;
  'suggestions.first.lessons.3': string;
  'suggestions.first.lessons.4': string;
  'suggestions.friend.hardTruths.3': string;
  'suggestions.friend.hardTruths.4': string;
  'suggestions.friend.goodFacts.3': string;
  'suggestions.friend.goodFacts.4': string;
  'suggestions.friend.lessons.3': string;
  'suggestions.friend.lessons.4': string;
  'suggestions.game.hardTruths.3': string;
  'suggestions.game.hardTruths.4': string;
  'suggestions.game.goodFacts.3': string;
  'suggestions.game.goodFacts.4': string;
  'suggestions.game.lessons.3': string;
  'suggestions.game.lessons.4': string;
  'suggestions.garden.hardTruths.3': string;
  'suggestions.garden.hardTruths.4': string;
  'suggestions.garden.goodFacts.3': string;
  'suggestions.garden.goodFacts.4': string;
  'suggestions.garden.lessons.3': string;
  'suggestions.garden.lessons.4': string;
  'suggestions.gift.hardTruths.3': string;
  'suggestions.gift.hardTruths.4': string;
  'suggestions.gift.goodFacts.3': string;
  'suggestions.gift.goodFacts.4': string;
  'suggestions.gift.lessons.3': string;
  'suggestions.gift.lessons.4': string;
  'suggestions.goodbye.hardTruths.3': string;
  'suggestions.goodbye.hardTruths.4': string;
  'suggestions.goodbye.goodFacts.3': string;
  'suggestions.goodbye.goodFacts.4': string;
  'suggestions.goodbye.lessons.3': string;
  'suggestions.goodbye.lessons.4': string;
  'suggestions.graduation.hardTruths.3': string;
  'suggestions.graduation.hardTruths.4': string;
  'suggestions.graduation.goodFacts.3': string;
  'suggestions.graduation.goodFacts.4': string;
  'suggestions.graduation.lessons.3': string;
  'suggestions.graduation.lessons.4': string;
  'suggestions.gym.hardTruths.3': string;
  'suggestions.gym.hardTruths.4': string;
  'suggestions.gym.goodFacts.3': string;
  'suggestions.gym.goodFacts.4': string;
  'suggestions.gym.lessons.3': string;
  'suggestions.gym.lessons.4': string;
  'suggestions.hangout.hardTruths.3': string;
  'suggestions.hangout.hardTruths.4': string;
  'suggestions.hangout.goodFacts.3': string;
  'suggestions.hangout.goodFacts.4': string;
  'suggestions.hangout.lessons.3': string;
  'suggestions.hangout.lessons.4': string;
  'suggestions.holiday.hardTruths.3': string;
  'suggestions.holiday.hardTruths.4': string;
  'suggestions.holiday.goodFacts.3': string;
  'suggestions.holiday.goodFacts.4': string;
  'suggestions.holiday.lessons.3': string;
  'suggestions.holiday.lessons.4': string;
  'suggestions.home.hardTruths.3': string;
  'suggestions.home.hardTruths.4': string;
  'suggestions.home.goodFacts.3': string;
  'suggestions.home.goodFacts.4': string;
  'suggestions.home.lessons.3': string;
  'suggestions.home.lessons.4': string;
  'suggestions.hospital.hardTruths.3': string;
  'suggestions.hospital.hardTruths.4': string;
  'suggestions.hospital.goodFacts.3': string;
  'suggestions.hospital.goodFacts.4': string;
  'suggestions.hospital.lessons.3': string;
  'suggestions.hospital.lessons.4': string;
  'suggestions.hug.hardTruths.3': string;
  'suggestions.hug.hardTruths.4': string;
  'suggestions.hug.goodFacts.3': string;
  'suggestions.hug.goodFacts.4': string;
  'suggestions.hug.lessons.3': string;
  'suggestions.hug.lessons.4': string;
  'suggestions.illness.hardTruths.3': string;
  'suggestions.illness.hardTruths.4': string;
  'suggestions.illness.goodFacts.3': string;
  'suggestions.illness.goodFacts.4': string;
  'suggestions.illness.lessons.3': string;
  'suggestions.illness.lessons.4': string;
  'suggestions.interview.hardTruths.3': string;
  'suggestions.interview.hardTruths.4': string;
  'suggestions.interview.goodFacts.3': string;
  'suggestions.interview.goodFacts.4': string;
  'suggestions.interview.lessons.3': string;
  'suggestions.interview.lessons.4': string;
  'suggestions.kiss.hardTruths.3': string;
  'suggestions.kiss.hardTruths.4': string;
  'suggestions.kiss.goodFacts.3': string;
  'suggestions.kiss.goodFacts.4': string;
  'suggestions.kiss.lessons.3': string;
  'suggestions.kiss.lessons.4': string;
  'suggestions.lake.hardTruths.3': string;
  'suggestions.lake.hardTruths.4': string;
  'suggestions.lake.goodFacts.3': string;
  'suggestions.lake.goodFacts.4': string;
  'suggestions.lake.lessons.3': string;
  'suggestions.lake.lessons.4': string;
  'suggestions.last.hardTruths.3': string;
  'suggestions.last.hardTruths.4': string;
  'suggestions.last.goodFacts.3': string;
  'suggestions.last.goodFacts.4': string;
  'suggestions.last.lessons.3': string;
  'suggestions.last.lessons.4': string;
  'suggestions.laugh.hardTruths.3': string;
  'suggestions.laugh.hardTruths.4': string;
  'suggestions.laugh.goodFacts.3': string;
  'suggestions.laugh.goodFacts.4': string;
  'suggestions.laugh.lessons.3': string;
  'suggestions.laugh.lessons.4': string;
  'suggestions.lie.hardTruths.3': string;
  'suggestions.lie.hardTruths.4': string;
  'suggestions.lie.goodFacts.3': string;
  'suggestions.lie.goodFacts.4': string;
  'suggestions.lie.lessons.3': string;
  'suggestions.lie.lessons.4': string;
  'suggestions.love.hardTruths.3': string;
  'suggestions.love.hardTruths.4': string;
  'suggestions.love.goodFacts.3': string;
  'suggestions.love.goodFacts.4': string;
  'suggestions.love.lessons.3': string;
  'suggestions.love.lessons.4': string;
  'suggestions.meeting.hardTruths.3': string;
  'suggestions.meeting.hardTruths.4': string;
  'suggestions.meeting.goodFacts.3': string;
  'suggestions.meeting.goodFacts.4': string;
  'suggestions.meeting.lessons.3': string;
  'suggestions.meeting.lessons.4': string;
  'suggestions.money.hardTruths.3': string;
  'suggestions.money.hardTruths.4': string;
  'suggestions.money.goodFacts.3': string;
  'suggestions.money.goodFacts.4': string;
  'suggestions.money.lessons.3': string;
  'suggestions.money.lessons.4': string;
  'suggestions.morning.hardTruths.3': string;
  'suggestions.morning.hardTruths.4': string;
  'suggestions.morning.goodFacts.3': string;
  'suggestions.morning.goodFacts.4': string;
  'suggestions.morning.lessons.3': string;
  'suggestions.morning.lessons.4': string;
  'suggestions.mother.hardTruths.3': string;
  'suggestions.mother.hardTruths.4': string;
  'suggestions.mother.goodFacts.3': string;
  'suggestions.mother.goodFacts.4': string;
  'suggestions.mother.lessons.3': string;
  'suggestions.mother.lessons.4': string;
  'suggestions.mountain.hardTruths.3': string;
  'suggestions.mountain.hardTruths.4': string;
  'suggestions.mountain.goodFacts.3': string;
  'suggestions.mountain.goodFacts.4': string;
  'suggestions.mountain.lessons.3': string;
  'suggestions.mountain.lessons.4': string;
  'suggestions.move.hardTruths.3': string;
  'suggestions.move.hardTruths.4': string;
  'suggestions.move.goodFacts.3': string;
  'suggestions.move.goodFacts.4': string;
  'suggestions.move.lessons.3': string;
  'suggestions.move.lessons.4': string;
  'suggestions.movie.hardTruths.3': string;
  'suggestions.movie.hardTruths.4': string;
  'suggestions.movie.goodFacts.3': string;
  'suggestions.movie.goodFacts.4': string;
  'suggestions.movie.lessons.3': string;
  'suggestions.movie.lessons.4': string;
  'suggestions.music.hardTruths.3': string;
  'suggestions.music.hardTruths.4': string;
  'suggestions.music.goodFacts.3': string;
  'suggestions.music.goodFacts.4': string;
  'suggestions.music.lessons.3': string;
  'suggestions.music.lessons.4': string;
  'suggestions.night.hardTruths.3': string;
  'suggestions.night.hardTruths.4': string;
  'suggestions.night.goodFacts.3': string;
  'suggestions.night.goodFacts.4': string;
  'suggestions.night.lessons.3': string;
  'suggestions.night.lessons.4': string;
  'suggestions.office.hardTruths.3': string;
  'suggestions.office.hardTruths.4': string;
  'suggestions.office.goodFacts.3': string;
  'suggestions.office.goodFacts.4': string;
  'suggestions.office.lessons.3': string;
  'suggestions.office.lessons.4': string;
  'suggestions.parent.hardTruths.3': string;
  'suggestions.parent.hardTruths.4': string;
  'suggestions.parent.goodFacts.3': string;
  'suggestions.parent.goodFacts.4': string;
  'suggestions.parent.lessons.3': string;
  'suggestions.parent.lessons.4': string;
  'suggestions.park.hardTruths.3': string;
  'suggestions.park.hardTruths.4': string;
  'suggestions.park.goodFacts.3': string;
  'suggestions.park.goodFacts.4': string;
  'suggestions.park.lessons.3': string;
  'suggestions.park.lessons.4': string;
  'suggestions.party.hardTruths.3': string;
  'suggestions.party.hardTruths.4': string;
  'suggestions.party.goodFacts.3': string;
  'suggestions.party.goodFacts.4': string;
  'suggestions.party.lessons.3': string;
  'suggestions.party.lessons.4': string;
  'suggestions.pet.hardTruths.3': string;
  'suggestions.pet.hardTruths.4': string;
  'suggestions.pet.goodFacts.3': string;
  'suggestions.pet.goodFacts.4': string;
  'suggestions.pet.lessons.3': string;
  'suggestions.pet.lessons.4': string;
  'suggestions.photo.hardTruths.3': string;
  'suggestions.photo.hardTruths.4': string;
  'suggestions.photo.goodFacts.3': string;
  'suggestions.photo.goodFacts.4': string;
  'suggestions.photo.lessons.3': string;
  'suggestions.photo.lessons.4': string;
  'suggestions.project.hardTruths.3': string;
  'suggestions.project.hardTruths.4': string;
  'suggestions.project.goodFacts.3': string;
  'suggestions.project.goodFacts.4': string;
  'suggestions.project.lessons.3': string;
  'suggestions.project.lessons.4': string;
  'suggestions.promise.hardTruths.3': string;
  'suggestions.promise.hardTruths.4': string;
  'suggestions.promise.goodFacts.3': string;
  'suggestions.promise.goodFacts.4': string;
  'suggestions.promise.lessons.3': string;
  'suggestions.promise.lessons.4': string;
  'suggestions.promotion.hardTruths.3': string;
  'suggestions.promotion.hardTruths.4': string;
  'suggestions.promotion.goodFacts.3': string;
  'suggestions.promotion.goodFacts.4': string;
  'suggestions.promotion.lessons.3': string;
  'suggestions.promotion.lessons.4': string;
  'suggestions.proposal.hardTruths.3': string;
  'suggestions.proposal.hardTruths.4': string;
  'suggestions.proposal.goodFacts.3': string;
  'suggestions.proposal.goodFacts.4': string;
  'suggestions.proposal.lessons.3': string;
  'suggestions.proposal.lessons.4': string;
  'suggestions.rain.hardTruths.3': string;
  'suggestions.rain.hardTruths.4': string;
  'suggestions.rain.goodFacts.3': string;
  'suggestions.rain.goodFacts.4': string;
  'suggestions.rain.lessons.3': string;
  'suggestions.rain.lessons.4': string;
  'suggestions.reading.hardTruths.3': string;
  'suggestions.reading.hardTruths.4': string;
  'suggestions.reading.goodFacts.3': string;
  'suggestions.reading.goodFacts.4': string;
  'suggestions.reading.lessons.3': string;
  'suggestions.reading.lessons.4': string;
  'suggestions.restaurant.hardTruths.3': string;
  'suggestions.restaurant.hardTruths.4': string;
  'suggestions.restaurant.goodFacts.3': string;
  'suggestions.restaurant.goodFacts.4': string;
  'suggestions.restaurant.lessons.3': string;
  'suggestions.restaurant.lessons.4': string;
  'suggestions.reunion.hardTruths.3': string;
  'suggestions.reunion.hardTruths.4': string;
  'suggestions.reunion.goodFacts.3': string;
  'suggestions.reunion.goodFacts.4': string;
  'suggestions.reunion.lessons.3': string;
  'suggestions.reunion.lessons.4': string;
  'suggestions.ring.hardTruths.3': string;
  'suggestions.ring.hardTruths.4': string;
  'suggestions.ring.goodFacts.3': string;
  'suggestions.ring.goodFacts.4': string;
  'suggestions.ring.lessons.3': string;
  'suggestions.ring.lessons.4': string;
  'suggestions.sand.hardTruths.3': string;
  'suggestions.sand.hardTruths.4': string;
  'suggestions.sand.goodFacts.3': string;
  'suggestions.sand.goodFacts.4': string;
  'suggestions.sand.lessons.3': string;
  'suggestions.sand.lessons.4': string;
  'suggestions.school.hardTruths.3': string;
  'suggestions.school.hardTruths.4': string;
  'suggestions.school.goodFacts.3': string;
  'suggestions.school.goodFacts.4': string;
  'suggestions.school.lessons.3': string;
  'suggestions.school.lessons.4': string;
  'suggestions.shopping.hardTruths.3': string;
  'suggestions.shopping.hardTruths.4': string;
  'suggestions.shopping.goodFacts.3': string;
  'suggestions.shopping.goodFacts.4': string;
  'suggestions.shopping.lessons.3': string;
  'suggestions.shopping.lessons.4': string;
  'suggestions.sibling.hardTruths.3': string;
  'suggestions.sibling.hardTruths.4': string;
  'suggestions.sibling.goodFacts.3': string;
  'suggestions.sibling.goodFacts.4': string;
  'suggestions.sibling.lessons.3': string;
  'suggestions.sibling.lessons.4': string;
  'suggestions.snow.hardTruths.3': string;
  'suggestions.snow.hardTruths.4': string;
  'suggestions.snow.goodFacts.3': string;
  'suggestions.snow.goodFacts.4': string;
  'suggestions.snow.lessons.3': string;
  'suggestions.snow.lessons.4': string;
  'suggestions.sport.hardTruths.3': string;
  'suggestions.sport.hardTruths.4': string;
  'suggestions.sport.goodFacts.3': string;
  'suggestions.sport.goodFacts.4': string;
  'suggestions.sport.lessons.3': string;
  'suggestions.sport.lessons.4': string;
  'suggestions.spring.hardTruths.3': string;
  'suggestions.spring.hardTruths.4': string;
  'suggestions.spring.goodFacts.3': string;
  'suggestions.spring.goodFacts.4': string;
  'suggestions.spring.lessons.3': string;
  'suggestions.spring.lessons.4': string;
  'suggestions.storm.hardTruths.3': string;
  'suggestions.storm.hardTruths.4': string;
  'suggestions.storm.goodFacts.3': string;
  'suggestions.storm.goodFacts.4': string;
  'suggestions.storm.lessons.3': string;
  'suggestions.storm.lessons.4': string;
  'suggestions.summer.hardTruths.3': string;
  'suggestions.summer.hardTruths.4': string;
  'suggestions.summer.goodFacts.3': string;
  'suggestions.summer.goodFacts.4': string;
  'suggestions.summer.lessons.3': string;
  'suggestions.summer.lessons.4': string;
  'suggestions.sunrise.hardTruths.3': string;
  'suggestions.sunrise.hardTruths.4': string;
  'suggestions.sunrise.goodFacts.3': string;
  'suggestions.sunrise.goodFacts.4': string;
  'suggestions.sunrise.lessons.3': string;
  'suggestions.sunrise.lessons.4': string;
  'suggestions.sunset.hardTruths.3': string;
  'suggestions.sunset.hardTruths.4': string;
  'suggestions.sunset.goodFacts.3': string;
  'suggestions.sunset.goodFacts.4': string;
  'suggestions.sunset.lessons.3': string;
  'suggestions.sunset.lessons.4': string;
  'suggestions.text.hardTruths.3': string;
  'suggestions.text.hardTruths.4': string;
  'suggestions.text.goodFacts.3': string;
  'suggestions.text.goodFacts.4': string;
  'suggestions.text.lessons.3': string;
  'suggestions.text.lessons.4': string;
  'suggestions.together.hardTruths.3': string;
  'suggestions.together.hardTruths.4': string;
  'suggestions.together.goodFacts.3': string;
  'suggestions.together.goodFacts.4': string;
  'suggestions.together.lessons.3': string;
  'suggestions.together.lessons.4': string;
  'suggestions.travel.hardTruths.3': string;
  'suggestions.travel.hardTruths.4': string;
  'suggestions.travel.goodFacts.3': string;
  'suggestions.travel.goodFacts.4': string;
  'suggestions.travel.lessons.3': string;
  'suggestions.travel.lessons.4': string;
  'suggestions.trip.hardTruths.3': string;
  'suggestions.trip.hardTruths.4': string;
  'suggestions.trip.goodFacts.3': string;
  'suggestions.trip.goodFacts.4': string;
  'suggestions.trip.lessons.3': string;
  'suggestions.trip.lessons.4': string;
  'suggestions.trust.hardTruths.3': string;
  'suggestions.trust.hardTruths.4': string;
  'suggestions.trust.goodFacts.3': string;
  'suggestions.trust.goodFacts.4': string;
  'suggestions.trust.lessons.3': string;
  'suggestions.trust.lessons.4': string;
  'suggestions.vacation.hardTruths.3': string;
  'suggestions.vacation.hardTruths.4': string;
  'suggestions.vacation.goodFacts.3': string;
  'suggestions.vacation.goodFacts.4': string;
  'suggestions.vacation.lessons.3': string;
  'suggestions.vacation.lessons.4': string;
  'suggestions.video.hardTruths.3': string;
  'suggestions.video.hardTruths.4': string;
  'suggestions.video.goodFacts.3': string;
  'suggestions.video.goodFacts.4': string;
  'suggestions.video.lessons.3': string;
  'suggestions.video.lessons.4': string;
  'suggestions.walk.hardTruths.3': string;
  'suggestions.walk.hardTruths.4': string;
  'suggestions.walk.goodFacts.3': string;
  'suggestions.walk.goodFacts.4': string;
  'suggestions.walk.lessons.3': string;
  'suggestions.walk.lessons.4': string;
  'suggestions.wedding.hardTruths.3': string;
  'suggestions.wedding.hardTruths.4': string;
  'suggestions.wedding.goodFacts.3': string;
  'suggestions.wedding.goodFacts.4': string;
  'suggestions.wedding.lessons.3': string;
  'suggestions.wedding.lessons.4': string;
  'suggestions.weekend.hardTruths.3': string;
  'suggestions.weekend.hardTruths.4': string;
  'suggestions.weekend.goodFacts.3': string;
  'suggestions.weekend.goodFacts.4': string;
  'suggestions.weekend.lessons.3': string;
  'suggestions.weekend.lessons.4': string;
  'suggestions.winter.hardTruths.3': string;
  'suggestions.winter.hardTruths.4': string;
  'suggestions.winter.goodFacts.3': string;
  'suggestions.winter.goodFacts.4': string;
  'suggestions.winter.lessons.3': string;
  'suggestions.winter.lessons.4': string;
  'suggestions.work.hardTruths.3': string;
  'suggestions.work.hardTruths.4': string;
  'suggestions.work.goodFacts.3': string;
  'suggestions.work.goodFacts.4': string;
  'suggestions.work.lessons.3': string;
  'suggestions.work.lessons.4': string;
  'suggestions.writing.hardTruths.3': string;
  'suggestions.writing.hardTruths.4': string;
  'suggestions.writing.goodFacts.3': string;
  'suggestions.writing.goodFacts.4': string;
  'suggestions.writing.lessons.3': string;
  'suggestions.writing.lessons.4': string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Tab labels
    'tab.home': 'Home',
    'tab.exProfiles': 'Ex Profiles',
    'tab.spheres': 'Sferas',
    'tab.settings': 'Settings',
    'home.emptyState': 'No profiles yet. Add your first ex-profile to get started.',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.language.description': 'Choose your preferred language',
    'settings.language.english': 'English',
    'settings.language.bulgarian': 'Bulgarian',
    'settings.theme': 'Theme',
    'settings.theme.description': 'Choose your preferred theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'settings.devTools.generateData.success': 'Created {profiles} profiles and {jobs} jobs with {memories} total memories!\n\nAll data has been saved to local storage. Navigate to the Sferas tab to see your data.',
    'settings.devTools.generateData.error': 'Failed to generate fake data. Please try again.',
    'settings.devTools.clearData.title': 'Clear All App Data',
    'settings.devTools.clearData.message': 'Are you sure you want to delete ALL data from this app? This will remove:\n\n• All profiles/partners\n• All jobs\n• All memories\n• All family members\n• All avatar positions\n\nThis action cannot be undone.\n\nYour theme and language settings will be preserved.',
    'settings.devTools.clearData.deleteButton': 'Delete All Data',
    'settings.devTools.clearData.success': 'All app data has been deleted from local storage.\n\nThe app will now show 0% and no profiles/jobs/memories.\n\nPlease navigate away and back to the Sferas/Home tab to see the changes reflected in the UI.',
    'settings.devTools.clearData.error': 'Failed to clear app data. Please try again.',
    'settings.devTools.cleanupMemories.button': 'Clean Up Orphaned Memories',
    'settings.devTools.cleanupMemories.success.withCount': 'Cleaned up {count} orphaned memories.',
    'settings.devTools.cleanupMemories.success.noOrphans': 'No orphaned memories found. All memories are valid.',
    'settings.devTools.cleanupMemories.error': 'Failed to clean up orphaned memories. Please try again.',
    'settings.notifications.title': 'Notifications',
    'settings.notifications.manage': 'Manage notifications',
    'settings.devTools.title': 'Development Tools',
    'settings.devTools.generateData.button': 'Generate Fake Data (Profiles & Jobs)',
    'settings.devTools.generateData.generating': 'Generating...',
    'settings.devTools.clearData.button': 'Clear All App Data',
    'settings.devTools.clearData.deleting': 'Deleting...',
    'wheel.noLessons.message': 'Add lessons to your memories to see them here and practice them!',
    'wheel.noHardTruths.message': 'Add hard truths to your memories to see them here!',
    'wheel.noSunnyMoments.message': 'Add sunny moments to your memories to see them here!',
    'wheel.spinForRandom': 'Spin the wheel',

    // Streak Rules Modal
    'streakRules.title': 'How Streaks Work',
    'streakRules.badges.title': 'Streak Badges',
    'streakRules.badges.subtitle': 'Badges reflect your consecutive days. Higher streaks unlock better badges!',
    'streakRules.badge.requires': 'Requires',
    'streakRules.badge.requires.day': 'day',
    'streakRules.badge.requires.days': 'days',
    'streakRules.rarity.common': 'COMMON',
    'streakRules.rarity.rare': 'RARE',
    'streakRules.rarity.epic': 'EPIC',
    'streakRules.rarity.legendary': 'LEGENDARY',
    'streakRules.badge.spark.name': 'Spark',
    'streakRules.badge.spark.description': 'First step on your journey',
    'streakRules.badge.flame.name': 'Flame',
    'streakRules.badge.flame.description': '3 days of consistent growth',
    'streakRules.badge.keeper.name': 'Keeper',
    'streakRules.badge.keeper.description': '1 week of dedication',
    'streakRules.badge.champion.name': 'Champion',
    'streakRules.badge.champion.description': '2 weeks strong',
    'streakRules.badge.warrior.name': 'Warrior',
    'streakRules.badge.warrior.description': '1 month of commitment',
    'streakRules.badge.legend.name': 'Legend',
    'streakRules.badge.legend.description': '2 months of mastery',
    'streakRules.badge.titan.name': 'Titan',
    'streakRules.badge.titan.description': '100-day milestone',
    'streakRules.badge.immortal.name': 'Immortal',
    'streakRules.badge.immortal.description': '1 year champion',
    'streak.badge.day': 'day',
    'streak.badge.days': 'days',
    'streak.modal.title': 'Your Streak 🔥',
    'streak.modal.currentStreak': 'Current Streak',
    'streak.modal.longestStreak': 'Longest Streak',
    'streak.modal.totalDays': 'Total Days',
    'streak.modal.badgesEarned': 'Badges Earned',
    'streak.modal.nextBadge': 'Next Badge',
    'streak.modal.daysToGo': 'to go!',
    'streak.modal.badgeCollection': 'Badge Collection',
    'streak.modal.startJourney': 'Start your journey',
    'streak.modal.motivation.start': 'Start your journey today! Log a moment to begin your streak 🌱',
    'streak.modal.motivation.building': 'You\'re building a habit! Keep it going 💪',
    'streak.modal.motivation.progress': 'Great progress! You\'re forming a powerful routine ⭐',
    'streak.modal.motivation.consistency': 'Amazing consistency! You\'re mastering self-reflection 🔥',
    'streak.modal.motivation.legend': 'You\'re a legend! Your dedication is inspiring 👑',
    
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.done': 'Done',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.optional': 'Optional',
    'common.discard': 'Discard',
    'memory.unsavedChanges.title': 'Unsaved Changes',
    'memory.unsavedChanges.message': 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
    'walkthrough.title': 'Welcome!',
    'walkthrough.message': 'Create records in each sphere to track the cloudy and sunny moments of your life. Start by adding a partner, job, family member, friend, or hobby!',
    'walkthrough.button': 'Got it!',
    
    // Profile screens
    'profile.add': 'Add Partner',
    'profile.edit': 'Edit Profile',
    'profile.editExInfo': 'Edit Info',
    'profile.editMemories': 'Edit Memories',
    'profile.editProfile': 'Edit Profile',
    'profile.editProfile.description': 'Choose what you\'d like to edit for this profile.',
    'profile.name': 'Name',
    'profile.exPartnerName': 'Partner\'s Name',
    'profile.exPartnerName.placeholder': 'Enter their name',
    'profile.description': 'Description',
    'profile.description.placeholder': 'Enter a short description (max 30 characters)',
    'profile.description.example': 'e.g., College sweetheart, first love...',
    'profile.uploadPicture': 'Add a Picture',
    'profile.changePicture': 'Change Picture',
    'profile.openingGallery': 'Opening gallery...',
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
    'profile.emptyState.title': 'Begin Your Journey to Sferas',
    'profile.emptyState.description': 'This is a safe space to document past relationships objectively. Creating a profile is the first constructive step towards understanding and moving on.',
    'profile.emptyState.button': 'Add Your First Partner Profile',
    'profile.actionSheet.edit': 'Edit Profile',
    'profile.actionSheet.viewHealingPath': 'View Healing Path',
    'profile.actionSheet.delete': 'Delete Profile',
    'profile.setup.complete': 'Setup Complete',
    'profile.setup.incomplete': 'Incomplete Setup ({percentage}%)',
    'profile.relationship': 'Relationship',
    'profile.ongoing.error.title': 'Cannot Set as Ongoing',
    'profile.ongoing.error.message': 'There is already an ongoing relationship. Please end the current relationship before starting a new one.',
    'profile.ongoing.warning': 'There is already an ongoing relationship',
    'profile.date.error.endBeforeStart': 'End date cannot be before start date.',
    'profile.date.error.startAfterEnd': 'Start date cannot be after end date.',
    'profile.relationshipStartDate': 'Relationship Start Date',
    'profile.relationshipStartDate.select': 'Select start date',
    'profile.relationshipStartDate.selectTitle': 'Select Start Date',
    'profile.relationshipEndDate': 'Relationship End Date',
    'profile.relationshipEndDate.select': 'Select end date',
    'profile.relationshipEndDate.selectTitle': 'Select End Date',
    'profile.relationshipOngoing': 'Relationship is ongoing',
    'profile.familyMemberName': 'Family Member Name',
    'profile.familyMemberName.placeholder': 'Enter their name',
    'profile.relationshipType': 'Relationship Type',
    'profile.relationshipType.placeholder': 'e.g., Mother, Father, Sister...',
    'profile.addFamilyMember': 'Add Family Member',
    'profile.editFamilyMember': 'Edit Family Member',
    'profile.editFamilyInfo': 'Edit Info',
    'profile.editFriendInfo': 'Edit Info',
    'profile.editHobbyInfo': 'Edit Info',
    'profile.familyEmptyState.title': 'No family members yet',
    'profile.familyEmptyState.description': 'Start tracking your family relationships',
    'profile.familyEmptyState.button': 'Add Family Member',
    'profile.familyDelete.confirm': 'Delete Family Member',
    'profile.familyDelete.confirm.message': 'Are you sure you want to delete this family member? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.familyDelete.confirm.message.withName': 'Are you sure you want to delete "{name}"? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.familyActionSheet.edit': 'Edit',
    'profile.familyActionSheet.delete': 'Delete',
    'profile.friendName': 'Friend Name',
    'profile.friendName.placeholder': 'Enter their name',
    'profile.addFriend': 'Add Friend',
    'profile.addFriend.description': 'Add a friend to track your relationship moments',
    'profile.editFriend': 'Edit Friend',
    'profile.editFriend.description': 'Update your friend\'s information',
    'profile.friendEmptyState.title': 'No friends yet',
    'profile.friendEmptyState.description': 'Start tracking your friendships',
    'profile.friendEmptyState.button': 'Add Friend',
    'profile.friendDelete.confirm': 'Delete Friend',
    'profile.friendDelete.confirm.message': 'Are you sure you want to delete this friend? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.friendDelete.confirm.message.withName': 'Are you sure you want to delete "{name}"? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.friendActionSheet.edit': 'Edit',
    'profile.friendActionSheet.delete': 'Delete',
    'profile.friend.name.required': 'Name is required',
    'profile.hobbyName': 'Hobby Name',
    'profile.hobbyName.placeholder': 'Enter hobby name',
    'profile.addHobby': 'Add Hobby',
    'profile.addHobby.description': 'Add a hobby to track your activity moments',
    'profile.editHobby': 'Edit Hobby',
    'profile.editHobby.description': 'Update your hobby\'s information',
    'profile.hobbyEmptyState.title': 'No hobbies yet',
    'profile.hobbyEmptyState.description': 'Start tracking your hobbies',
    'profile.hobbyEmptyState.button': 'Add Hobby',
    'profile.hobbyDelete.confirm': 'Delete Hobby',
    'profile.hobbyDelete.confirm.message': 'Are you sure you want to delete this hobby? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.hobbyDelete.confirm.message.withName': 'Are you sure you want to delete "{name}"? This will permanently delete all associated memories and data. This action cannot be undone.',
    'profile.hobbyActionSheet.edit': 'Edit',
    'profile.hobbyActionSheet.delete': 'Delete',
    'profile.hobby.name.required': 'Name is required',
    'job.addJob': 'Add Job',
    'job.editJob': 'Edit Job',
    'job.editJobInfo': 'Edit Info',
    'job.jobTitle': 'Job Title',
    'job.jobTitle.placeholder': 'Enter job title',
    'job.companyName': 'Company Name',
    'job.companyName.placeholder': 'Enter company name',
    'job.jobDescription': 'Job Description',
    'job.jobDescription.placeholder': 'Enter a short description',
    'job.jobEmptyState.title': 'No jobs yet',
    'job.jobEmptyState.description': 'Start tracking your career journey',
    'job.jobEmptyState.button': 'Add Job',
    'job.jobDelete.confirm': 'Delete Job',
    'job.jobDelete.confirm.message': 'Are you sure you want to delete this job? This will permanently delete all associated memories and data. This action cannot be undone.',
    'job.jobDelete.confirm.message.withName': 'Are you sure you want to delete "{name}"? This will permanently delete all associated memories and data. This action cannot be undone.',
    'job.jobActionSheet.edit': 'Edit',
    'job.jobActionSheet.delete': 'Delete',
    'spheres.title': 'Life Sferas',
    'spheres.encouragement.general': 'You have lots of great moments in your life. Take time to enjoy and appreciate them!',
    'spheres.encouragement.goodMomentsPrevail': 'Wonderful! Good moments prevail in your life. Appreciate and embrace the positive experiences you\'ve created! ✨',
    'spheres.encouragement.keepPushing': 'Keep pushing forward, even though it\'s hard! Consider meeting up with family or friends, or exploring a new hobby to create more sunny moments in your life. 💪',
    'spheres.encouragement.calculating': 'Analyzing your moments',
    'spheres.wheelOfLife.lessonLearned': 'Lesson from the Wheel of Life',
    'spheres.relationships': 'Relationships',
    'spheres.career': 'Career',
    'spheres.family': 'Family',
    'spheres.friends': 'Friends',
    'spheres.hobbies': 'Hobbies',
    'spheres.item': 'item',
    'spheres.items': 'items',
    
    // Insights
    'insights.wheelOfLife.title': 'Insights',
    'insights.wheelOfLife.subtitle': 'Analyze your life balance across different sferas',
    'insights.wheelOfLife.distributionExplanation': 'The percentages show how much time you dedicate to each sphere in terms of total moments. They represent the proportion of all your moments that belong to each sphere compared to the others.',
    'insights.wheelOfLife.percentageExplanation': 'The percentages represent the proportion of sunny (positive) moments versus cloudy (difficult) moments across all entities in each sphere. A higher percentage indicates more positive experiences.',
    'insights.recommendations.title': 'Recommendations',
    'insights.relationships.critical': 'Your relationships sphere needs urgent attention. Focus on creating positive memories and addressing challenges.',
    'insights.relationships.needsImprovement': 'Your relationships sphere could benefit from more positive moments. Consider focusing on building stronger connections.',
    'insights.relationships.strength': 'Your relationships sphere is a strength! Keep nurturing these connections.',
    'insights.career.critical': 'Your career sphere needs urgent attention. Focus on creating positive experiences and addressing work challenges.',
    'insights.career.needsImprovement': 'Your career sphere could benefit from more positive moments. Consider focusing on professional growth and satisfaction.',
    'insights.career.strength': 'Your career sphere is a strength! Keep building on your professional success.',
    'insights.family.critical': 'Your family sphere needs urgent attention. Focus on creating positive memories and strengthening family bonds.',
    'insights.family.needsImprovement': 'Your family sphere could benefit from more positive moments. Consider focusing on family relationships and connections.',
    'insights.family.strength': 'Your family sphere is a strength! Keep nurturing these important relationships.',
    'insights.relationships.current.low': 'Only {percentage}% of the moments in your current relationship with {name} are sunny (the rest are cloudy).',
    'insights.relationships.pattern.current': 'Only {percentage}% of the moments in your current relationship with {name} are sunny.',
    'insights.career.current.low': 'Only {percentage}% of the moments in your current job at {name} are positive (the rest are challenging).',
    'insights.career.pattern.current': 'Only {percentage}% of the moments in your current job at {name} are positive.',
    'insights.family.member.low': 'Only {percentage}% of the moments with {name} are positive (the rest are challenging).',
    'insights.family.pattern': 'Only {percentage}% of the moments with {name} are positive.',
    'insights.comparison.currentRelationships': 'Current Relationships',
    'insights.comparison.pastRelationships': 'Past Relationships',
    'insights.comparison.currentJobs': 'Current Jobs',
    'insights.comparison.pastJobs': 'Previous Jobs',
    'insights.comparison.label.current': 'Current',
    'insights.comparison.label.ex': 'Ex',
    'insights.comparison.label.past': 'Past',
    'insights.comparison.familyMembers': 'Family Members',
    'insights.comparison.relationships.title': 'Relationships Comparison',
    'insights.comparison.relationships.chartTitle': 'How Sunny and Cloudy Moments Change Across Partners',
    'insights.comparison.relationships.subtitle': 'Overall amount of moments',
    'insights.comparison.relationships.goodMoments': 'Sunny Facts',
    'insights.comparison.relationships.badMoments': 'Cloudy Moments',
    'insights.comparison.relationships.you': 'You',
    'insights.comparison.relationships.partner': 'Partner',
    'insights.comparison.relationships.cloudyLabel': 'C',
    'insights.comparison.relationships.facts': 'Facts',
    'insights.comparison.relationships.warning.lower': 'Your current partner has a lower proportion of sunny moments compared to your past relationships. Consider what might be causing this difference.',
    'insights.comparison.relationships.warning.close': 'Your current relationship has a similar proportion of sunny moments to your past relationships. This might be a pattern worth examining.',
    'insights.comparison.relationships.kudos': 'Great progress! Your current relationship has significantly more sunny moments compared to your past relationships. Keep nurturing this positive connection!',
    'insights.comparison.relationships.percentageExplanationTitle': 'What does this percentage mean?',
    'insights.comparison.relationships.percentageExplanation': 'The {percentage}% represents the proportion of sunny (positive) moments versus cloudy (difficult) moments. A higher percentage means more positive experiences recorded.',
    'insights.comparison.relationships.totalMoments': 'Total Moments',
    'insights.comparison.relationships.quality': 'sunny',
    'insights.comparison.relationships.requiresEntities': 'Add memories and moments on other sferas to see relationships comparison insights.',
    'insights.comparison.relationships.sphereComparison.moreRelationshipTime': 'Relationships prevail in your life, with significantly more moments recorded compared to career. Your personal connections are a priority.',
    'insights.comparison.relationships.sphereComparison.moreCareerTime': 'Career prevails in your life, with significantly more moments recorded compared to relationships. Consider balancing your focus between work and personal connections.',
    'insights.comparison.relationships.sphereComparison.balancedTime': 'You have an approximately balanced work-life distribution between relationships and career.',
    'insights.comparison.relationships.sphereComparison.betterRelationshipQuality': 'Your relationships have significantly better quality (more sunny moments) compared to your career. Great job nurturing your connections!',
    'insights.comparison.relationships.sphereComparison.betterCareerQuality': 'Your career has significantly better quality (more sunny moments) compared to your relationships. Consider focusing more on building positive connections.',
    'insights.comparison.general.balance': 'Remember to strive for balance in life. No sphere should be left behind - nurturing all aspects of your life contributes to overall well-being.',
    'insights.comparison.requiresEntities': 'Add memories and moments on other sferas to see comparison insights.',
    'insights.comparison.career.title': 'Career Comparison',
    'insights.comparison.career.chartTitle': 'How Sunny and Cloudy Moments Change Across Jobs',
    'insights.comparison.career.subtitle': 'Overall amount of moments',
    'insights.comparison.career.requiresEntities': 'Add memories and moments on other sferas to see career comparison insights.',
    'insights.comparison.career.goodMoments': 'Sunny Facts',
    'insights.comparison.career.badMoments': 'Cloudy Moments',
    'insights.comparison.career.warning.lower': 'Your current job has a lower proportion of sunny moments compared to your past jobs. Consider what might be causing this difference.',
    'insights.comparison.career.warning.close': 'Your current job has a similar proportion of sunny moments to your past jobs. This might be a pattern worth examining.',
    'insights.comparison.career.kudos': 'Great progress! Your current job has significantly more sunny moments compared to your past jobs. Keep nurturing this positive experience!',
    'insights.comparison.career.percentageExplanationTitle': 'What does this percentage mean?',
    'insights.comparison.career.percentageExplanation': 'The {percentage}% represents the proportion of sunny (positive) moments versus cloudy (difficult) moments across all your career experiences. A higher percentage means more positive experiences recorded.',
    'insights.comparison.career.totalMoments': 'Total Moments',
    'insights.comparison.career.quality': 'sunny',
    'insights.comparison.career.sphereComparison.moreCareerTime': 'Career prevails in your life, with significantly more moments recorded compared to relationships. Consider balancing your focus between work and personal connections.',
    'insights.comparison.career.sphereComparison.moreRelationshipTime': 'Relationships prevail in your life, with significantly more moments recorded compared to career. Your personal connections are a priority.',
    'insights.comparison.career.sphereComparison.balancedTime': 'You have an approximately balanced work-life distribution between career and relationships.',
    'insights.comparison.career.sphereComparison.betterCareerQuality': 'Your career has significantly better quality (more sunny moments) compared to your relationships. Consider focusing more on building positive connections.',
    'insights.comparison.career.sphereComparison.betterRelationshipQuality': 'Your relationships have significantly better quality (more sunny moments) compared to your career. Great job nurturing your connections!',
    'insights.comparison.family.title': 'Family Comparison',
    'insights.comparison.family.subtitle': 'Overall amount of moments',
    'insights.comparison.family.totalMoments': 'Total Moments',
    'insights.comparison.family.quality': 'Moment Quality',
    'insights.comparison.family.sunny': 'Sunny',
    'insights.comparison.family.cloudy': 'Cloudy',
    'insights.comparison.family.noData': 'No data available for comparison',
    'insights.comparison.family.requiresEntities': 'Add memories and moments on other sferas to see family comparison insights.',
    'insights.comparison.family.insight.moreFamilyTime': 'You spend more time with family than on your career.',
    'insights.comparison.family.insight.moreCareerTime': 'You spend more time on your career than with family. Consider finding more time for family moments.',
    'insights.comparison.family.insight.balancedTime': 'You have a well-balanced distribution of time between family and career.',
    'insights.comparison.family.insight.betterFamilyQuality': 'Your family moments have significantly better quality than your career moments. This shows strong family connections!',
    'insights.comparison.family.insight.betterCareerQuality': 'Your career moments have better quality than your family moments. Consider nurturing more positive family experiences.',
    'insights.comparison.family.members.title': 'Time with Family Members',
    'insights.comparison.family.members.balanced': 'You have a well-balanced distribution of moments across all family members. Great family harmony!',
    'insights.comparison.family.members.catchUp': 'Consider spending more time with',
    'insights.comparison.family.members.andQuality': 'and their moments have lower quality',
    'insights.comparison.family.members.qualityTime': 'Try spending more quality time with',
    'insights.comparison.family.members.mostTime': 'You spend most of your family moments with',
    'insights.comparison.friends.title': 'Friends Comparison',
    'insights.comparison.friends.subtitle': 'Overall amount of moments',
    'insights.comparison.friends.noData': 'No data available for comparison',
    'insights.comparison.friends.requiresEntities': 'Add memories and moments on other sferas to see friends comparison insights.',
    'insights.comparison.friends.otherSpheres': 'Other Sferas',
    'insights.comparison.friends.insight.moreFriendsTime': 'You spend more time with friends than on average with other sferas.',
    'insights.comparison.friends.insight.moreOtherSpheresTime': 'You spend less time with friends compared to other sferas. Consider finding more time for friendships.',
    'insights.comparison.friends.insight.balancedTime': 'You have a well-balanced distribution of time between friends and other sferas.',
    'insights.comparison.friends.members.title': 'Time with Friends',
    'insights.comparison.friends.members.balanced': 'You have a well-balanced distribution of moments across all friends. Great friendship harmony!',
    'insights.comparison.friends.members.catchUp': 'Consider spending more time with',
    'insights.comparison.friends.members.andQuality': 'and their moments have lower quality',
    'insights.comparison.friends.members.qualityTime': 'Try spending more quality time with',
    'insights.comparison.friends.members.mostTime': 'You spend most of your friend moments with',
    'insights.comparison.hobbies.title': 'Hobbies Comparison',
    'insights.comparison.hobbies.subtitle': 'Overall amount of moments',
    'insights.comparison.hobbies.noData': 'No data available for comparison',
    'insights.comparison.hobbies.requiresEntities': 'Add memories and moments on other sferas to see hobbies comparison insights.',
    'insights.comparison.hobbies.otherSpheres': 'Other Sferas',
    'insights.comparison.hobbies.insight.moreHobbiesTime': 'You spend more time on hobbies than on average with other sferas.',
    'insights.comparison.hobbies.insight.moreOtherSpheresTime': 'You spend less time on hobbies compared to other sferas. Consider finding more time for your interests.',
    'insights.comparison.hobbies.insight.balancedTime': 'You have a well-balanced distribution of time between hobbies and other sferas.',
    'insights.comparison.hobbies.members.title': 'Time on Hobbies',
    'insights.comparison.hobbies.members.balanced': 'You have a well-balanced distribution of moments across all hobbies. Great hobby balance!',
    'insights.comparison.hobbies.members.catchUp': 'Consider spending more time on',
    'insights.comparison.hobbies.members.mostTime': 'You spend most of your hobby moments on',
    'insights.detail.relationship.title': 'Relationship Details',
    'insights.detail.relationship.noData': 'Relationship not found',
    'insights.detail.relationship.memories.title': 'Memories',
    'insights.detail.relationship.memories.noData': 'No memories recorded for this relationship',
    'insights.detail.relationship.memories.more.better': 'This relationship has significantly more memories compared to your other relationships, and the overall quality (sunny moments) is better.',
    'insights.detail.relationship.memories.more.worse': 'This relationship has significantly more memories compared to your other relationships, but the overall quality (sunny moments) is lower.',
    'insights.detail.relationship.memories.more.same': 'This relationship has significantly more memories compared to your other relationships, with similar overall quality.',
    'insights.detail.relationship.memories.less.better': 'This relationship has fewer memories compared to your other relationships, but the overall quality (sunny moments) is better.',
    'insights.detail.relationship.memories.less.worse': 'This relationship has fewer memories compared to your other relationships, and the overall quality (sunny moments) is also lower.',
    'insights.detail.relationship.memories.less.same': 'This relationship has fewer memories compared to your other relationships, with similar overall quality.',
    'insights.detail.relationship.memories.same.better': 'This relationship has approximately the same amount of memories as your other relationships, but the overall quality (sunny moments) is better.',
    'insights.detail.relationship.memories.same.worse': 'This relationship has approximately the same amount of memories as your other relationships, but the overall quality (sunny moments) is lower.',
    'insights.detail.relationship.memories.same.same': 'This relationship has approximately the same amount of memories and similar overall quality compared to your other relationships.',
    'insights.detail.job.title': 'Job Details',
    'insights.detail.job.noData': 'Job not found',
    'insights.detail.job.memories.title': 'Memories',
    'insights.detail.job.memories.noData': 'No memories recorded for this job',
    'insights.detail.job.memories.more.better': 'This job has significantly more memories compared to your other jobs, and the overall quality (sunny moments) is better.',
    'insights.detail.job.memories.more.worse': 'This job has significantly more memories compared to your other jobs, but the overall quality (sunny moments) is lower.',
    'insights.detail.job.memories.more.same': 'This job has significantly more memories compared to your other jobs, with similar overall quality.',
    'insights.detail.job.memories.less.better': 'This job has fewer memories compared to your other jobs, but the overall quality (sunny moments) is better.',
    'insights.detail.job.memories.less.worse': 'This job has fewer memories compared to your other jobs, and the overall quality (sunny moments) is also lower.',
    'insights.detail.job.memories.less.same': 'This job has fewer memories compared to your other jobs, with similar overall quality.',
    'insights.detail.job.memories.same.better': 'This job has approximately the same amount of memories as your other jobs, but the overall quality (sunny moments) is better.',
    'insights.detail.job.memories.same.worse': 'This job has approximately the same amount of memories as your other jobs, but the overall quality (sunny moments) is lower.',
    'insights.detail.job.memories.same.same': 'This job has approximately the same amount of memories and similar overall quality compared to your other jobs.',
    'insights.detail.family.title': 'Family Member Details',
    'insights.detail.family.noData': 'Family member not found',
    'insights.detail.family.memories.title': 'Memories',
    'insights.detail.family.memories.noData': 'No memories recorded for this family member',
    'insights.detail.family.memories.more.better': 'This family member has significantly more memories compared to your other family members, and the overall quality (sunny moments) is better.',
    'insights.detail.family.memories.more.worse': 'This family member has significantly more memories compared to your other family members, but the overall quality (sunny moments) is lower.',
    'insights.detail.family.memories.more.same': 'This family member has significantly more memories compared to your other family members, with similar overall quality.',
    'insights.detail.family.memories.less.better': 'This family member has fewer memories compared to your other family members, but the overall quality (sunny moments) is better.',
    'insights.detail.family.memories.less.worse': 'This family member has fewer memories compared to your other family members, and the overall quality (sunny moments) is also lower.',
    'insights.detail.family.memories.less.same': 'This family member has fewer memories compared to your other family members, with similar overall quality.',
    'insights.detail.family.memories.same.better': 'This family member has approximately the same amount of memories as your other family members, but the overall quality (sunny moments) is better.',
    'insights.detail.family.memories.same.worse': 'This family member has approximately the same amount of memories as your other family members, but the overall quality (sunny moments) is lower.',
    'insights.detail.family.memories.same.same': 'This family member has approximately the same amount of memories and similar overall quality compared to your other family members.',
    'insights.suggestion.relationships.worse': 'Your current relationship has fewer sunny moments compared to past relationships. Consider focusing on creating more positive experiences together.',
    'insights.suggestion.relationships.low': 'Create more sunny moments with your current partner to strengthen your relationship. Small gestures and quality time can make a big difference.',
    'insights.suggestion.relationships.progress': 'Great progress! You\'re creating more positive moments than in your past relationships. Keep nurturing this connection.',
    'insights.suggestion.relationships.strong': 'Your relationship is thriving with many sunny moments! Continue to foster this positive connection.',
    'insights.suggestion.career.worse': 'Your current job has fewer positive moments compared to previous roles. Consider what changes could improve your work satisfaction.',
    'insights.suggestion.career.low': 'Focus on creating more positive experiences at work. Identify what brings you joy and satisfaction in your role.',
    'insights.suggestion.career.progress': 'Excellent progress! You\'re experiencing more positive moments than in previous jobs. Keep building on this success.',
    'insights.suggestion.career.strong': 'You\'re thriving in your career with many positive moments! Continue to grow and find fulfillment in your work.',
    'insights.suggestion.family.low': 'Create more positive moments with family members to strengthen these important relationships.',
    'insights.suggestion.family.strong': 'Your family relationships are strong with many positive moments! Keep nurturing these bonds.',
    'profile.ongoing': 'Ongoing',
    'profile.noMemories': 'No memories',
    'profile.oneMemory': '1 memory',
    'profile.memories': 'memories',
    'profile.relationshipQuality': 'Relationship quality',
    'profile.relationshipQuality.positive': 'positive',
    'job.ongoing': 'Ongoing',
    'job.current': 'Current',
    'job.noMemories': 'No memories',
    'job.oneMemory': '1 memory',
    'job.memories': 'memories',
    'job.satisfaction': 'Job satisfaction',
    'job.satisfaction.positive': 'positive',
    'job.addNewJob': 'Add New Job',
    'job.editJob.title': 'Edit Job',
    'job.addJob.description': 'Track your career journey by adding a job position.',
    'job.editJob.description': 'Update your job information and track your career journey.',
    'job.editJob.manage': 'Manage your job information and memories.',
    'job.jobTitleAndCompany': 'Job Title / Company Name',
    'job.jobTitleAndCompany.placeholder': 'e.g., Software Engineer at Google',
    'job.description.placeholder': 'Brief description of the role...',
    'job.startDate': 'Start Date',
    'job.startDate.select': 'Select start date',
    'job.startDate.selectTitle': 'Select Start Date',
    'job.currentJob': 'Current job',
    'job.endDate': 'End Date',
    'job.endDate.select': 'Select end date',
    'job.endDate.selectTitle': 'Select End Date',
    'job.companyLogo': 'Company Logo / Image (Optional)',
    'profile.addFamilyMember.description': 'Add a new family member to track your memories',
    'profile.editFamilyMember.description': 'Update family member information',
    'profile.familyMember.name.required': 'Name is required',
    
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
    'memory.lesson': 'Lesson',
    'memory.lesson.plural': 'Lessons',
    'memory.lesson.none': 'No Lessons yet',
    'memory.lesson.placeholder': 'Enter lesson learned...',
    'memory.sunnyMoment': 'Sunny Moment',
    'memory.fillAllClouds': 'Please fill all available clouds with text before continuing.',
    'memory.fillAllSuns': 'Please fill all available suns with text before continuing.',
    'memory.save': 'Save Memory',
    'memory.delete': 'Delete',
    'memory.delete.confirm': 'Delete Memory',
    'memory.delete.confirm.message': 'Are you sure you want to delete this memory? This action cannot be undone.',
    'memory.delete.confirm.message.withTitle': 'Are you sure you want to delete "{title}"? This action cannot be undone.',
    'memory.emptyState.title': 'No Memories Yet',
    'memory.emptyState.description': 'This is the first step to gaining clarity. Listing your memories helps you assess the reality, turning rumination into action.',
    'memory.error.titleRequired': 'Please enter a memory title.',
    'memory.error.saveFailed': 'Failed to save memory. Please try again.',
    'memory.error.deleteFailed': 'Failed to delete memory. Please try again.',
    'memory.error.atLeastOneMomentRequired': 'Please add at least one moment (cloud or sun) to the memory.',
    'memory.error.fillAllCloudsBeforeAdding': 'Please fill all existing clouds with text before adding a new one.',
    'memory.error.fillAllSunsBeforeAdding': 'Please fill all existing suns with text before adding a new one.',
    'memory.error.fillAllLessonsBeforeAdding': 'Please fill all existing lessons with text before adding a new one.',
    'memory.actionSheet.edit': 'Edit',
    'memory.actionSheet.delete': 'Delete',
    'memory.remindWhy': 'Remind Why',
    
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
    'error.missingParameters': 'Missing required parameters. Please go back and try again.',
    'error.cameraPermissionRequired': 'Sorry, we need camera roll permissions to upload photos!',
    'error.imagePickFailed': 'Failed to pick image. Please try again.',
    
    // Subscription
    'subscription.title': 'Unlock Premium',
    'subscription.subtitle': 'Get unlimited access to all features',
    'subscription.feature.unlimited': 'Unlimited partners, jobs, friends, family members, and hobbies',
    'subscription.feature.insights': 'Access to premium insights and analytics',
    'subscription.feature.support': 'Priority support',
    'subscription.monthly.title': 'Monthly',
    'subscription.monthly.period': 'per month',
    'subscription.yearly.title': 'Yearly',
    'subscription.yearly.period': 'per year',
    'subscription.yearly.savings': 'Save {percent}%',
    'subscription.purchase': 'Subscribe',
    'subscription.restore': 'Restore Purchases',
    'subscription.view': 'View Plans',
    'subscription.success.title': 'Success!',
    'subscription.success.message': 'Your subscription is now active!',
    'subscription.error.title': 'Purchase Failed',
    'subscription.error.message': 'Something went wrong. Please try again.',
    'subscription.restore.success.title': 'Restored',
    'subscription.restore.success.message': 'Your purchases have been restored.',
    'subscription.restore.error.title': 'Restore Failed',
    'subscription.restore.error.message': 'No purchases found to restore.',
    'subscription.limit.title': 'Subscription Required',
    'subscription.limit.partner': 'You can create one partner for free. Subscribe to create more partners.',
    'subscription.limit.job': 'You can create one job for free. Subscribe to create more jobs.',
    'subscription.limit.friend': 'You can create one friend for free. Subscribe to create more friends.',
    'subscription.limit.family': 'You can create one family member for free. Subscribe to create more family members.',
    'subscription.limit.hobby': 'You can create one hobby for free. Subscribe to create more hobbies.',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.sphere.friends': 'Friends',
    'notifications.sphere.family': 'Family',
    'notifications.sphere.relationships': 'Relationships',
    'notifications.status.on': 'On',
    'notifications.status.off': 'Off',
    'notifications.settings.title': 'Notification settings',
    'notifications.settings.turnOn': 'Turn on',
    'notifications.settings.turnOnDescription': 'Turn on to enable notifications.',
    'notifications.settings.message': 'Message',
    'notifications.settings.messagePlaceholder': 'Check in with {name} today',
    'notifications.settings.frequency': 'Frequency',
    'notifications.settings.frequency.daily': 'Daily',
    'notifications.settings.frequency.weekly': 'Weekly',
    'notifications.settings.dayOfWeek': 'Day of week',
    'notifications.settings.dayOfWeek.sun': 'Sun',
    'notifications.settings.dayOfWeek.mon': 'Mon',
    'notifications.settings.dayOfWeek.tue': 'Tue',
    'notifications.settings.dayOfWeek.wed': 'Wed',
    'notifications.settings.dayOfWeek.thu': 'Thu',
    'notifications.settings.dayOfWeek.fri': 'Fri',
    'notifications.settings.dayOfWeek.sat': 'Sat',
    'notifications.settings.time': 'Time',
    'notifications.settings.done': 'Done',
    'notifications.settings.sound': 'Sound',
    'notifications.settings.sound.on': 'On',
    'notifications.settings.sound.off': 'Off',
    'notifications.settings.condition': 'Condition',
    'notifications.settings.condition.met': 'Met',
    'notifications.settings.condition.notMet': 'Not Met',
    'notifications.settings.condition.belowAvg': 'Below avg',
    'notifications.settings.condition.noRecent': 'No recent',
    'notifications.settings.condition.lessThanJob': 'Less than job',
    'notifications.settings.condition.lessThanFriendsAvg': 'Less than friends avg',
    'notifications.settings.condition.noRecentDaysPlaceholder': 'No recent days (e.g., 7)',
    'notifications.settings.condition.belowAvg.title': 'Below average',
    'notifications.settings.condition.belowAvg.body': 'Notify when this entity has fewer moments than the average across all entities in this sphere. Helps identify relationships that might need more attention.',
    'notifications.settings.condition.noRecent.title': 'No recent moments',
    'notifications.settings.condition.noRecent.body': 'Notify when you haven\'t added any moments for this entity in the specified number of days. Helps you maintain regular reflection and connection.',
    'notifications.settings.condition.lessThanJob.title': 'Less than job',
    'notifications.settings.condition.lessThanJob.body': 'Notify when this relationship has fewer moments (memories, insights) than your current job. This helps ensure you\'re giving enough attention to your relationships.',
    'notifications.settings.condition.lessThanFriendsAvg.title': 'Less than friends avg',
    'notifications.settings.condition.lessThanFriendsAvg.body': 'Notify when this relationship has fewer moments than the average of your friendships. This helps maintain balance between romantic relationships and friendships.',
    'notifications.settings.sphere': 'Sphere',

    // Onboarding
    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.back': 'Back',
    'onboarding.finish': 'Get Started',
    'onboarding.done': 'Done',
    'onboarding.demo': 'Try Demo',
    'onboarding.of': 'of',
    'onboarding.intro.title': 'Welcome to Sferas!',
    'onboarding.intro.message': 'Sferas helps you appreciate and track the total amount of sunny vs cloudy moments in your life, measured as % in the main avatar. See at a glance how balanced each sphere of your life is.',
    'onboarding.welcome.title': 'Reflect on Your Journey',
    'onboarding.welcome.message': 'Revisit your life\'s moments and lessons to remember your past and shape your future. Take control of your journey by reflecting on what matters most across all areas of your life.',
    'onboarding.moments.title': 'Track Your Moments',
    'onboarding.moments.message': 'Capture both sunny and cloudy moments from your life. Record memories, reflect on experiences, and revisit them anytime to gain perspective and understanding.',
    'onboarding.lessons.title': 'Learn & Grow',
    'onboarding.lessons.message': 'Extract valuable lessons from your experiences. Document what you\'ve learned from both positive and challenging moments to foster personal growth and avoid repeating patterns.',
    'onboarding.insights.title': 'Visualize Your Journey',
    'onboarding.insights.message': 'View your life through the Wheel of Life chart. Get insights into how your time and energy are distributed across different spheres and identify areas that need attention.',
    'onboarding.notifications.title': 'Stay Connected',
    'onboarding.notifications.message': 'Set reminders to keep in touch with important people or catch up on different life spheres. Never lose track of what matters most to you.',
    'onboarding.getStarted.title': 'Ready to Begin?',
    'onboarding.getStarted.message': 'Start by creating records in each sphere. Add partners, jobs, family members, friends, or hobbies to begin tracking your life\'s moments and discovering meaningful insights.',

    // Settings - Help Section
    'settings.help.title': 'Help',
    'settings.help.viewGuide': 'View Guide',

    // Moment Suggestions
    'suggestions.birthday.hardTruths.0': "They didn't remember my birthday",
    'suggestions.birthday.hardTruths.1': "I was left alone on my special day",
    'suggestions.birthday.hardTruths.2': "The celebration felt forced and uncomfortable",
    'suggestions.birthday.goodFacts.0': "I learned who really cares about me",
    'suggestions.birthday.goodFacts.1': "I can create my own joy without validation",
    'suggestions.birthday.goodFacts.2': "Some friends showed up when it mattered",
    'suggestions.birthday.lessons.0': "Birthdays don't define my worth",
    'suggestions.birthday.lessons.1': "True friends show up without reminders",
    'suggestions.birthday.lessons.2': "I can celebrate myself first",
    'suggestions.anniversary.hardTruths.0': "They forgot our anniversary",
    'suggestions.anniversary.hardTruths.1': "The day meant more to me than to them",
    'suggestions.anniversary.hardTruths.2': "I felt alone even when we were together",
    'suggestions.anniversary.goodFacts.0': "I remember the good times we had",
    'suggestions.anniversary.goodFacts.1': "I honored our history even if they didn't",
    'suggestions.anniversary.goodFacts.2': "I learned what I truly value in relationships",
    'suggestions.anniversary.lessons.0': "Equal investment matters in relationships",
    'suggestions.anniversary.lessons.1': "I deserve someone who remembers what's important",
    'suggestions.anniversary.lessons.2': "Memory and effort show true care",
    'suggestions.breakup.hardTruths.0': "The relationship was over long before we ended it",
    'suggestions.breakup.hardTruths.1': "I ignored the red flags for too long",
    'suggestions.breakup.hardTruths.2': "We wanted different things but neither admitted it",
    'suggestions.breakup.goodFacts.0': "I finally found the courage to let go",
    'suggestions.breakup.goodFacts.1': "I'm free to find someone who truly values me",
    'suggestions.breakup.goodFacts.2': "I learned what I don't want in a partner",
    'suggestions.breakup.lessons.0': "Staying for comfort isn't the same as love",
    'suggestions.breakup.lessons.1': "I deserve someone who fights for us",
    'suggestions.breakup.lessons.2': "Endings can be new beginnings",
    'suggestions.wedding.hardTruths.0': "I felt invisible at their wedding",
    'suggestions.wedding.hardTruths.1': "Watching them move on was harder than expected",
    'suggestions.wedding.hardTruths.2': "I realized what we could have had",
    'suggestions.wedding.goodFacts.0': "I showed strength by attending",
    'suggestions.wedding.goodFacts.1': "I can be happy for them despite my pain",
    'suggestions.wedding.goodFacts.2': "I handled it with grace and dignity",
    'suggestions.wedding.lessons.0': "Their happiness doesn't diminish mine",
    'suggestions.wedding.lessons.1': "Closure comes from within, not from events",
    'suggestions.wedding.lessons.2': "I'm capable of moving forward",
    'suggestions.holiday.hardTruths.0': "The holidays felt empty without them",
    'suggestions.holiday.hardTruths.1': "Family gatherings highlighted what I lost",
    'suggestions.holiday.hardTruths.2': "I felt like an outsider in familiar places",
    'suggestions.holiday.goodFacts.0': "I created new traditions for myself",
    'suggestions.holiday.goodFacts.1': "I found joy in unexpected places",
    'suggestions.holiday.goodFacts.2': "Some family members really showed up for me",
    'suggestions.holiday.lessons.0': "Holidays can be redefined and reclaimed",
    'suggestions.holiday.lessons.1': "Traditions evolve and that's okay",
    'suggestions.holiday.lessons.2': "I can create joy independently",
    'suggestions.christmas.hardTruths.0': "Christmas reminded me of what I lost",
    'suggestions.christmas.hardTruths.1': "The empty seat at the table hurt more than expected",
    'suggestions.christmas.hardTruths.2': "Everyone else seemed happy while I struggled",
    'suggestions.christmas.goodFacts.0': "I survived the hardest holiday season",
    'suggestions.christmas.goodFacts.1': "I found moments of peace and gratitude",
    'suggestions.christmas.goodFacts.2': "I learned I'm stronger than I thought",
    'suggestions.christmas.lessons.0': "Grief and joy can coexist",
    'suggestions.christmas.lessons.1': "It's okay to feel differently than others",
    'suggestions.christmas.lessons.2': "Next year will be easier",
    'suggestions.vacation.hardTruths.0': "The trip we planned together never happened",
    'suggestions.vacation.hardTruths.1': "I saw them vacation with someone new",
    'suggestions.vacation.hardTruths.2': "Our travel dreams died with the relationship",
    'suggestions.vacation.goodFacts.0': "I took that trip solo and loved it",
    'suggestions.vacation.goodFacts.1': "I discovered new places on my own terms",
    'suggestions.vacation.goodFacts.2': "I proved I don't need a partner to explore",
    'suggestions.vacation.lessons.0': "Independence can be liberating",
    'suggestions.vacation.lessons.1': "Solo adventures are just as meaningful",
    'suggestions.vacation.lessons.2': "I can create memories without them",
    'suggestions.trip.hardTruths.0': "Our planned trips together never materialized",
    'suggestions.trip.hardTruths.1': "They took trips without me that we'd dreamed of",
    'suggestions.trip.hardTruths.2': "Traveling together revealed our incompatibility",
    'suggestions.trip.goodFacts.0': "I'm planning trips that excite me",
    'suggestions.trip.goodFacts.1': "I can travel anywhere I want now",
    'suggestions.trip.goodFacts.2': "Solo trips taught me independence",
    'suggestions.trip.lessons.0': "Adventure doesn't require a partner",
    'suggestions.trip.lessons.1': "I can explore the world on my own terms",
    'suggestions.trip.lessons.2': "Travel plans should align with my desires, not compromise",
    'suggestions.walk.hardTruths.0': "Our walks together became silent and uncomfortable",
    'suggestions.walk.hardTruths.1': "They never wanted to walk with me",
    'suggestions.walk.hardTruths.2': "Walking alone reminded me of what I lost",
    'suggestions.walk.goodFacts.0': "Walking alone is peaceful and meditative",
    'suggestions.walk.goodFacts.1': "I can walk wherever I want, at my own pace",
    'suggestions.walk.goodFacts.2': "Walks help me process and heal",
    'suggestions.walk.lessons.0': "Solitude in nature is healing",
    'suggestions.walk.lessons.1': "Moving forward literally helps me move forward emotionally",
    'suggestions.walk.lessons.2': "I can find peace in simple moments alone",
    'suggestions.mountain.hardTruths.0': "The mountains we planned to climb together remain unclimbed",
    'suggestions.mountain.hardTruths.1': "They reached peaks without me",
    'suggestions.mountain.hardTruths.2': "Mountain adventures we dreamed of never happened",
    'suggestions.mountain.goodFacts.0': "I'm conquering my own mountains now",
    'suggestions.mountain.goodFacts.1': "Mountain views remind me of life's bigger picture",
    'suggestions.mountain.goodFacts.2': "Climbing teaches me I can overcome anything",
    'suggestions.mountain.lessons.0': "I can reach peaks on my own",
    'suggestions.mountain.lessons.1': "The journey up is just as important as the view",
    'suggestions.mountain.lessons.2': "Every summit proves my strength",
    'suggestions.lake.hardTruths.0': "Lakeside memories we shared are now bittersweet",
    'suggestions.lake.hardTruths.1': "They enjoyed the water without me",
    'suggestions.lake.hardTruths.2': "Our peaceful moments by the lake are gone",
    'suggestions.lake.goodFacts.0': "Lakes still bring me peace and tranquility",
    'suggestions.lake.goodFacts.1': "Water has a calming, healing effect",
    'suggestions.lake.goodFacts.2': "I can find serenity by the water alone",
    'suggestions.lake.lessons.0': "Nature's peace belongs to everyone",
    'suggestions.lake.lessons.1': "Still waters reflect my inner calm",
    'suggestions.lake.lessons.2': "I can reclaim peaceful places for myself",
    'suggestions.sand.hardTruths.0': "Walking on sand together felt like walking on broken promises",
    'suggestions.sand.hardTruths.1': "The beach reminds me of plans that washed away",
    'suggestions.sand.hardTruths.2': "Our footprints in the sand were temporary, like our relationship",
    'suggestions.sand.goodFacts.0': "Sand between my toes still feels grounding",
    'suggestions.sand.goodFacts.1': "Beaches are places of renewal and letting go",
    'suggestions.sand.goodFacts.2': "Every wave washes away a little more pain",
    'suggestions.sand.lessons.0': "Like sand, I can reshape myself",
    'suggestions.sand.lessons.1': "The tide always comes in fresh and new",
    'suggestions.sand.lessons.2': "Beach memories can be reclaimed for new beginnings",
    'suggestions.work.hardTruths.0': "My career stress contributed to our problems",
    'suggestions.work.hardTruths.1': "I prioritized work over the relationship",
    'suggestions.work.hardTruths.2': "They never understood my professional ambitions",
    'suggestions.work.goodFacts.0': "I achieved professional growth during hard times",
    'suggestions.work.goodFacts.1': "Work provided stability when life was chaotic",
    'suggestions.work.goodFacts.2': "I proved I can succeed independently",
    'suggestions.work.lessons.0': "Balance between work and life is crucial",
    'suggestions.work.lessons.1': "A partner should support my ambitions",
    'suggestions.work.lessons.2': "Success means nothing without fulfillment",
    'suggestions.family.hardTruths.0': "My family never really accepted them",
    'suggestions.family.hardTruths.1': "Family events became awkward and painful",
    'suggestions.family.hardTruths.2': "I lost some family connections in the breakup",
    'suggestions.family.goodFacts.0': "My family supported me through it all",
    'suggestions.family.goodFacts.1': "I strengthened bonds with siblings",
    'suggestions.family.goodFacts.2': "Family helped me see my worth",
    'suggestions.family.lessons.0': "Family wisdom often sees what we can't",
    'suggestions.family.lessons.1': "Blood is thicker than broken promises",
    'suggestions.family.lessons.2': "True family shows up in crisis",
    'suggestions.move.hardTruths.0': "They chose a place over our relationship",
    'suggestions.move.hardTruths.1': "The distance revealed our true commitment",
    'suggestions.move.hardTruths.2': "I sacrificed my location for nothing",
    'suggestions.move.goodFacts.0': "I found a new home and new beginnings",
    'suggestions.move.goodFacts.1': "The move gave me space to heal",
    'suggestions.move.goodFacts.2': "I built a life that's truly mine",
    'suggestions.move.lessons.0': "Home is where I make it, not where they are",
    'suggestions.move.lessons.1': "Geography can't fix relationship problems",
    'suggestions.move.lessons.2': "I'm capable of starting over anywhere",
    'suggestions.fight.hardTruths.0': "We fought about the same things repeatedly",
    'suggestions.fight.hardTruths.1': "The arguments became more important than solutions",
    'suggestions.fight.hardTruths.2': "I said things I can't take back",
    'suggestions.fight.goodFacts.0': "I learned to communicate my needs clearly",
    'suggestions.fight.goodFacts.1': "I discovered my boundaries through conflict",
    'suggestions.fight.goodFacts.2': "Some fights revealed incompatibilities early",
    'suggestions.fight.lessons.0': "How we fight matters more than what we fight about",
    'suggestions.fight.lessons.1': "Respect must remain even in disagreement",
    'suggestions.fight.lessons.2': "Some patterns can't be changed",
    'suggestions.trust.hardTruths.0': "The trust was broken and never fully restored",
    'suggestions.trust.hardTruths.1': "I stayed despite knowing the truth",
    'suggestions.trust.hardTruths.2': "My intuition was right all along",
    'suggestions.trust.goodFacts.0': "I'm learning to trust myself again",
    'suggestions.trust.goodFacts.1': "I didn't compromise my values in the end",
    'suggestions.trust.goodFacts.2': "I chose self-respect over comfort",
    'suggestions.trust.lessons.0': "Trust is the foundation of everything",
    'suggestions.trust.lessons.1': "Once broken, it's rarely the same",
    'suggestions.trust.lessons.2': "I must trust myself first",
    'suggestions.cheat.hardTruths.0': "They chose someone else while with me",
    'suggestions.cheat.hardTruths.1': "I was never enough for them",
    'suggestions.cheat.hardTruths.2': "The betrayal cut deeper than I admitted",
    'suggestions.cheat.goodFacts.0': "I discovered my strength through betrayal",
    'suggestions.cheat.goodFacts.1': "I learned I deserve complete loyalty",
    'suggestions.cheat.goodFacts.2': "I found self-worth beyond their validation",
    'suggestions.cheat.lessons.0': "Cheating is about their character, not my worth",
    'suggestions.cheat.lessons.1': "I deserve unwavering faithfulness",
    'suggestions.cheat.lessons.2': "Betrayal teaches who people really are",
    'suggestions.lie.hardTruths.0': "They lied about important things",
    'suggestions.lie.hardTruths.1': "I accepted half-truths for too long",
    'suggestions.lie.hardTruths.2': "The foundation was built on deception",
    'suggestions.lie.goodFacts.0': "I eventually saw through the lies",
    'suggestions.lie.goodFacts.1': "I learned to recognize dishonesty",
    'suggestions.lie.goodFacts.2': "I value authenticity more than ever",
    'suggestions.lie.lessons.0': "Honesty is non-negotiable",
    'suggestions.lie.lessons.1': "Small lies reveal bigger character flaws",
    'suggestions.lie.lessons.2': "Truth is the only foundation for love",
    'suggestions.friend.hardTruths.0': "Some friends took their side",
    'suggestions.friend.hardTruths.1': "I lost mutual friends in the breakup",
    'suggestions.friend.hardTruths.2': "Friends saw problems I couldn't see",
    'suggestions.friend.goodFacts.0': "True friends stayed by my side",
    'suggestions.friend.goodFacts.1': "I made new, deeper friendships",
    'suggestions.friend.goodFacts.2': "Friends helped me rediscover myself",
    'suggestions.friend.lessons.0': "Real friends are revealed in hardship",
    'suggestions.friend.lessons.1': "Quality matters more than quantity",
    'suggestions.friend.lessons.2': "Friendship is a choice, not an obligation",
    'suggestions.pet.hardTruths.0': "We had to decide who keeps our pet",
    'suggestions.pet.hardTruths.1': "The pet misses them too",
    'suggestions.pet.hardTruths.2': "Shared pet custody is heartbreaking",
    'suggestions.pet.goodFacts.0': "Our pet gives unconditional love",
    'suggestions.pet.goodFacts.1': "I have a loyal companion through this",
    'suggestions.pet.goodFacts.2': "The pet brought us joy even in hard times",
    'suggestions.pet.lessons.0': "Pets love us through everything",
    'suggestions.pet.lessons.1': "Simple companionship can heal",
    'suggestions.pet.lessons.2': "Unconditional love still exists",
    'suggestions.home.hardTruths.0': "The home we built together is just a place now",
    'suggestions.home.hardTruths.1': "Every corner holds painful memories",
    'suggestions.home.hardTruths.2': "I had to leave the home I loved",
    'suggestions.home.goodFacts.0': "I'm creating a new space that's truly mine",
    'suggestions.home.goodFacts.1': "The house was never what made it home",
    'suggestions.home.goodFacts.2': "I can start fresh without those memories",
    'suggestions.home.lessons.0': "Home is a feeling, not a place",
    'suggestions.home.lessons.1': "I can create sanctuary anywhere",
    'suggestions.home.lessons.2': "Spaces can be reclaimed and redefined",
    'suggestions.money.hardTruths.0': "Financial stress revealed our incompatibility",
    'suggestions.money.hardTruths.1': "They valued money over our relationship",
    'suggestions.money.hardTruths.2': "I was used financially",
    'suggestions.money.goodFacts.0': "I'm financially independent now",
    'suggestions.money.goodFacts.1': "I learned to manage money on my own",
    'suggestions.money.goodFacts.2': "Financial freedom is empowering",
    'suggestions.money.lessons.0': "Financial values must align in relationships",
    'suggestions.money.lessons.1': "Independence is invaluable",
    'suggestions.money.lessons.2': "Money reveals character",
    'suggestions.apology.hardTruths.0': "The apology came too late",
    'suggestions.apology.hardTruths.1': "Words without actions are meaningless",
    'suggestions.apology.hardTruths.2': "I deserved an apology that never came",
    'suggestions.apology.goodFacts.0': "I learned to apologize to myself",
    'suggestions.apology.goodFacts.1': "I don't need their apology to heal",
    'suggestions.apology.goodFacts.2': "I can forgive without accepting excuses",
    'suggestions.apology.lessons.0': "Closure doesn't require their participation",
    'suggestions.apology.lessons.1': "Actions speak louder than apologies",
    'suggestions.apology.lessons.2': "I can move on without their sorry",
    'suggestions.promise.hardTruths.0': "Promises were broken without a second thought",
    'suggestions.promise.hardTruths.1': "Words were cheap, commitment was cheaper",
    'suggestions.promise.hardTruths.2': "I believed promises I shouldn't have",
    'suggestions.promise.goodFacts.0': "I learned the value of my own word",
    'suggestions.promise.goodFacts.1': "I keep promises to myself now",
    'suggestions.promise.goodFacts.2': "I recognize empty promises quickly now",
    'suggestions.promise.lessons.0': "Watch actions, not words",
    'suggestions.promise.lessons.1': "Keep promises to yourself first",
    'suggestions.promise.lessons.2': "Commitment shows in behavior, not speech",
    'suggestions.graduation.hardTruths.0': "They weren't there for my big achievement",
    'suggestions.graduation.hardTruths.1': "I celebrated alone what should have been shared",
    'suggestions.graduation.hardTruths.2': "Their absence tarnished a moment I worked hard for",
    'suggestions.graduation.goodFacts.0': "I accomplished this milestone on my own",
    'suggestions.graduation.goodFacts.1': "My achievement doesn't depend on their presence",
    'suggestions.graduation.goodFacts.2': "I proved I can succeed independently",
    'suggestions.graduation.lessons.0': "I celebrate my wins with or without them",
    'suggestions.graduation.lessons.1': "Achievements belong to me alone",
    'suggestions.graduation.lessons.2': "Success is sweeter when it's truly mine",
    'suggestions.promotion.hardTruths.0': "They didn't celebrate my professional success",
    'suggestions.promotion.hardTruths.1': "My achievements meant nothing to them",
    'suggestions.promotion.hardTruths.2': "I worked hard but felt unsupported",
    'suggestions.promotion.goodFacts.0': "I earned this through my own effort",
    'suggestions.promotion.goodFacts.1': "My career growth shows my resilience",
    'suggestions.promotion.goodFacts.2': "I'm building a life that's truly mine",
    'suggestions.promotion.lessons.0': "I don't need their validation to succeed",
    'suggestions.promotion.lessons.1': "Professional growth happens with or without them",
    'suggestions.promotion.lessons.2': "My worth isn't measured by their acknowledgment",
    'suggestions.illness.hardTruths.0': "They weren't there when I was sick",
    'suggestions.illness.hardTruths.1': "I felt alone during my most vulnerable moments",
    'suggestions.illness.hardTruths.2': "My health struggles didn't matter to them",
    'suggestions.illness.goodFacts.0': "I learned to care for myself",
    'suggestions.illness.goodFacts.1': "I found strength I didn't know I had",
    'suggestions.illness.goodFacts.2': "I survived without their support",
    'suggestions.illness.lessons.0': "I must prioritize my own health",
    'suggestions.illness.lessons.1': "Self-care isn't selfish, it's necessary",
    'suggestions.illness.lessons.2': "I can rely on myself in sickness",
    'suggestions.hospital.hardTruths.0': "They never visited me in the hospital",
    'suggestions.hospital.hardTruths.1': "I faced my fear alone when I needed support",
    'suggestions.hospital.hardTruths.2': "Medical emergencies revealed their true priorities",
    'suggestions.hospital.goodFacts.0': "I handled medical challenges with courage",
    'suggestions.hospital.goodFacts.1': "I learned I'm stronger than I thought",
    'suggestions.hospital.goodFacts.2': "I have people who truly care about my health",
    'suggestions.hospital.lessons.0': "True care shows up in crisis",
    'suggestions.hospital.lessons.1': "Health emergencies reveal character",
    'suggestions.hospital.lessons.2': "I deserve support in my hardest moments",
    'suggestions.concert.hardTruths.0': "We planned to go together but they went with someone else",
    'suggestions.concert.hardTruths.1': "I attended alone, remembering our plans",
    'suggestions.concert.hardTruths.2': "The music reminded me of what we shared",
    'suggestions.concert.goodFacts.0': "I enjoyed the music on my own terms",
    'suggestions.concert.goodFacts.1': "I discovered I can have fun alone",
    'suggestions.concert.goodFacts.2': "Music still brings me joy without them",
    'suggestions.concert.lessons.0': "I don't need a date to enjoy life",
    'suggestions.concert.lessons.1': "Shared interests don't require shared experiences",
    'suggestions.concert.lessons.2': "I can create new memories alone",
    'suggestions.restaurant.hardTruths.0': "Our favorite restaurant holds too many memories",
    'suggestions.restaurant.hardTruths.1': "I ate alone at places we discovered together",
    'suggestions.restaurant.hardTruths.2': "Every meal reminded me of our conversations",
    'suggestions.restaurant.goodFacts.0': "I can enjoy dining solo now",
    'suggestions.restaurant.goodFacts.1': "I'm discovering new favorite places",
    'suggestions.restaurant.goodFacts.2': "Food still brings me comfort and joy",
    'suggestions.restaurant.lessons.0': "Places can be reclaimed and redefined",
    'suggestions.restaurant.lessons.1': "I can find joy in simple pleasures alone",
    'suggestions.restaurant.lessons.2': "New memories can overwrite old ones",
    'suggestions.date.hardTruths.0': "They canceled our plans last minute repeatedly",
    'suggestions.date.hardTruths.1': "Our dates became obligations, not joys",
    'suggestions.date.hardTruths.2': "I put more effort into dates than they did",
    'suggestions.date.goodFacts.0': "I learned what makes a good date",
    'suggestions.date.goodFacts.1': "I know what I want in future dates",
    'suggestions.date.goodFacts.2': "I'm ready for someone who values our time together",
    'suggestions.date.lessons.0': "Dates should be wanted, not forced",
    'suggestions.date.lessons.1': "Effort in planning shows care",
    'suggestions.date.lessons.2': "I deserve someone excited to spend time with me",
    'suggestions.gift.hardTruths.0': "They never put thought into gifts for me",
    'suggestions.gift.hardTruths.1': "My gifts to them were more meaningful than theirs to me",
    'suggestions.gift.hardTruths.2': "Gift-giving became one-sided",
    'suggestions.gift.goodFacts.0': "I learned the joy of giving without expectation",
    'suggestions.gift.goodFacts.1': "I appreciate people who remember special occasions",
    'suggestions.gift.goodFacts.2': "I can give myself meaningful gifts now",
    'suggestions.gift.lessons.0': "Gifts reflect thoughtfulness and care",
    'suggestions.gift.lessons.1': "I deserve someone who puts effort into making me happy",
    'suggestions.gift.lessons.2': "Material things matter less than the gesture",
    'suggestions.text.hardTruths.0': "They left my messages on read for days",
    'suggestions.text.hardTruths.1': "One-word replies showed their disinterest",
    'suggestions.text.hardTruths.2': "I always initiated conversations",
    'suggestions.text.goodFacts.0': "I stopped waiting for replies that never came",
    'suggestions.text.goodFacts.1': "I learned my worth isn't measured by response time",
    'suggestions.text.goodFacts.2': "I found people who actually want to talk to me",
    'suggestions.text.lessons.0': "Communication should be two-way",
    'suggestions.text.lessons.1': "If they wanted to, they would",
    'suggestions.text.lessons.2': "I deserve enthusiastic conversation partners",
    'suggestions.call.hardTruths.0': "They never answered when I needed them",
    'suggestions.call.hardTruths.1': "Phone calls became one-sided monologues",
    'suggestions.call.hardTruths.2': "I stopped calling because they never called back",
    'suggestions.call.goodFacts.0': "I found people who answer when I call",
    'suggestions.call.goodFacts.1': "I learned to rely on myself more",
    'suggestions.call.goodFacts.2': "I don't wait for calls that won't come",
    'suggestions.call.lessons.0': "Availability matters in relationships",
    'suggestions.call.lessons.1': "I deserve people who want to hear from me",
    'suggestions.call.lessons.2': "Phone calls should be wanted, not avoided",
    'suggestions.party.hardTruths.0': "They ignored me at parties we attended together",
    'suggestions.party.hardTruths.1': "I felt like a stranger at our own events",
    'suggestions.party.hardTruths.2': "They socialized while I felt invisible",
    'suggestions.party.goodFacts.0': "I learned to enjoy parties independently",
    'suggestions.party.goodFacts.1': "I can have fun without their validation",
    'suggestions.party.goodFacts.2': "I discovered I'm actually good at socializing alone",
    'suggestions.party.lessons.0': "Partners should make each other feel included",
    'suggestions.party.lessons.1': "I can thrive in social situations independently",
    'suggestions.party.lessons.2': "I deserve someone who wants me by their side",
    'suggestions.coffee.hardTruths.0': "Our coffee dates became awkward silences",
    'suggestions.coffee.hardTruths.1': "They always seemed distracted during our conversations",
    'suggestions.coffee.hardTruths.2': "I noticed they'd rather be anywhere else",
    'suggestions.coffee.goodFacts.0': "I learned to enjoy coffee alone",
    'suggestions.coffee.goodFacts.1': "Cafes became my peaceful space",
    'suggestions.coffee.goodFacts.2': "I can have meaningful conversations with myself",
    'suggestions.coffee.lessons.0': "Simple moments should feel comfortable",
    'suggestions.coffee.lessons.1': "Presence matters more than the place",
    'suggestions.coffee.lessons.2': "I deserve engaging conversations over coffee",
    'suggestions.school.hardTruths.0': "They didn't support my educational goals",
    'suggestions.school.hardTruths.1': "My studies became a source of conflict",
    'suggestions.school.hardTruths.2': "They saw my ambitions as a threat",
    'suggestions.school.goodFacts.0': "I pursued education for myself",
    'suggestions.school.goodFacts.1': "Learning gives me purpose and growth",
    'suggestions.school.goodFacts.2': "Education is an investment in my future",
    'suggestions.school.lessons.0': "A partner should support my growth",
    'suggestions.school.lessons.1': "Education is non-negotiable",
    'suggestions.school.lessons.2': "I'm building a better future for myself",
    'suggestions.gym.hardTruths.0': "They criticized my fitness goals",
    'suggestions.gym.hardTruths.1': "Working out became something I hid from them",
    'suggestions.gym.hardTruths.2': "They made me feel self-conscious about my body",
    'suggestions.gym.goodFacts.0': "I exercise for my mental and physical health",
    'suggestions.gym.goodFacts.1': "The gym became my sanctuary",
    'suggestions.gym.goodFacts.2': "I'm building strength inside and out",
    'suggestions.gym.lessons.0': "Self-improvement should be encouraged",
    'suggestions.gym.lessons.1': "My body goals are my own",
    'suggestions.gym.lessons.2': "A partner should lift me up, not bring me down",
    'suggestions.music.hardTruths.0': "Our songs became too painful to hear",
    'suggestions.music.hardTruths.1': "Music we discovered together now triggers sadness",
    'suggestions.music.hardTruths.2': "They ruined artists I once loved",
    'suggestions.music.goodFacts.0': "I'm discovering new music that's just mine",
    'suggestions.music.goodFacts.1': "Music still moves me deeply",
    'suggestions.music.goodFacts.2': "I can find new meaning in old songs",
    'suggestions.music.lessons.0': "Music can be reclaimed and redefined",
    'suggestions.music.lessons.1': "Art belongs to me, not our memories",
    'suggestions.music.lessons.2': "New songs can create new associations",
    'suggestions.movie.hardTruths.0': "Movie nights became lonely experiences",
    'suggestions.movie.hardTruths.1': "They'd rather watch alone than with me",
    'suggestions.movie.hardTruths.2': "Our shared interests didn't translate to quality time",
    'suggestions.movie.goodFacts.0': "I can enjoy films on my own",
    'suggestions.movie.goodFacts.1': "Movie theaters became my escape",
    'suggestions.movie.goodFacts.2': "I'm discovering new favorites independently",
    'suggestions.movie.lessons.0': "Shared interests need shared effort",
    'suggestions.movie.lessons.1': "I can find joy in solo entertainment",
    'suggestions.movie.lessons.2': "Quality time matters more than the activity",
    'suggestions.photo.hardTruths.0': "Looking at old photos brings more pain than joy",
    'suggestions.photo.hardTruths.1': "They deleted our memories without hesitation",
    'suggestions.photo.hardTruths.2': "Pictures revealed truths I couldn't see before",
    'suggestions.photo.goodFacts.0': "I'm taking new photos of my life now",
    'suggestions.photo.goodFacts.1': "Photos document my growth and healing",
    'suggestions.photo.goodFacts.2': "I can look back with clarity instead of pain",
    'suggestions.photo.lessons.0': "Photos capture moments, not permanence",
    'suggestions.photo.lessons.1': "I'm creating new memories worth photographing",
    'suggestions.photo.lessons.2': "The past is over, but I have a future",
    'suggestions.travel.hardTruths.0': "The trip we dreamed of will never happen",
    'suggestions.travel.hardTruths.1': "Travel plans died with the relationship",
    'suggestions.travel.hardTruths.2': "They went on adventures I was excluded from",
    'suggestions.travel.goodFacts.0': "I'm planning trips just for me",
    'suggestions.travel.goodFacts.1': "Traveling solo is liberating",
    'suggestions.travel.goodFacts.2': "The world is still full of places to discover",
    'suggestions.travel.lessons.0': "I can explore the world alone",
    'suggestions.travel.lessons.1': "Adventure doesn't require a partner",
    'suggestions.travel.lessons.2': "Travel heals and expands perspectives",
    'suggestions.airport.hardTruths.0': "They never came to pick me up",
    'suggestions.airport.hardTruths.1': "Airport goodbyes revealed their true feelings",
    'suggestions.airport.hardTruths.2': "Traveling to see them was always one-way effort",
    'suggestions.airport.goodFacts.0': "I learned to navigate airports independently",
    'suggestions.airport.goodFacts.1': "Airports symbolize my freedom now",
    'suggestions.airport.goodFacts.2': "I can travel wherever I want, whenever I want",
    'suggestions.airport.lessons.0': "Effort should be mutual in long-distance",
    'suggestions.airport.lessons.1': "I'm free to go anywhere without permission",
    'suggestions.airport.lessons.2': "Travel represents my independence",
    'suggestions.beach.hardTruths.0': "Our beach memories are now bittersweet",
    'suggestions.beach.hardTruths.1': "The ocean reminds me of promises that washed away",
    'suggestions.beach.hardTruths.2': "They loved the beach more than they loved me",
    'suggestions.beach.goodFacts.0': "The ocean still brings me peace",
    'suggestions.beach.goodFacts.1': "Beaches are places of renewal and healing",
    'suggestions.beach.goodFacts.2': "Water has a way of washing away pain",
    'suggestions.beach.lessons.0': "Nature heals regardless of who's beside me",
    'suggestions.beach.lessons.1': "The ocean's vastness puts things in perspective",
    'suggestions.beach.lessons.2': "I can find peace in the same places again",
    'suggestions.park.hardTruths.0': "Walking in parks reminded me of what we lost",
    'suggestions.park.hardTruths.1': "Nature felt empty without them",
    'suggestions.park.hardTruths.2': "Our favorite spots became places to avoid",
    'suggestions.park.goodFacts.0': "Nature still brings me peace and clarity",
    'suggestions.park.goodFacts.1': "Parks are places of healing and reflection",
    'suggestions.park.goodFacts.2': "I'm finding new favorite spots",
    'suggestions.park.lessons.0': "Nature belongs to everyone",
    'suggestions.park.lessons.1': "The outdoors can be reclaimed for myself",
    'suggestions.park.lessons.2': "Peace comes from within, not from company",
    'suggestions.shopping.hardTruths.0': "Shopping together became a chore for them",
    'suggestions.shopping.hardTruths.1': "They criticized my choices and preferences",
    'suggestions.shopping.hardTruths.2': "Our styles reflected our incompatibility",
    'suggestions.shopping.goodFacts.0': "I'm developing my own unique style",
    'suggestions.shopping.goodFacts.1': "Shopping is now a form of self-expression",
    'suggestions.shopping.goodFacts.2': "I can buy what makes me happy without judgment",
    'suggestions.shopping.lessons.0': "Personal style is about self-expression",
    'suggestions.shopping.lessons.1': "I don't need approval for my choices",
    'suggestions.shopping.lessons.2': "Shopping alone can be empowering",
    'suggestions.car.hardTruths.0': "They never wanted to drive to see me",
    'suggestions.car.hardTruths.1': "Car rides became silent and tense",
    'suggestions.car.hardTruths.2': "The car we shared now holds painful memories",
    'suggestions.car.goodFacts.0': "I have freedom to go anywhere",
    'suggestions.car.goodFacts.1': "Driving alone is peaceful and liberating",
    'suggestions.car.goodFacts.2': "The road ahead is mine to choose",
    'suggestions.car.lessons.0': "Independence means going my own way",
    'suggestions.car.lessons.1': "I control where I'm headed",
    'suggestions.car.lessons.2': "The journey matters more than who's in the passenger seat",
    'suggestions.game.hardTruths.0': "They never wanted to play with me",
    'suggestions.game.hardTruths.1': "Gaming became a way to avoid me",
    'suggestions.game.hardTruths.2': "Our interests diverged completely",
    'suggestions.game.goodFacts.0': "I enjoy games on my own terms",
    'suggestions.game.goodFacts.1': "Gaming is a healthy escape and fun",
    'suggestions.game.goodFacts.2': "I can find communities that share my interests",
    'suggestions.game.lessons.0': "Hobbies don't require partner participation",
    'suggestions.game.lessons.1': "I can enjoy my interests independently",
    'suggestions.game.lessons.2': "Shared interests aren't necessary for compatibility",
    'suggestions.default.hardTruths.0': "I ignored the signs that were always there",
    'suggestions.default.hardTruths.1': "I stayed longer than I should have",
    'suggestions.default.hardTruths.2': "I compromised too much of myself",
    'suggestions.default.goodFacts.0': "I learned what I truly need in a relationship",
    'suggestions.default.goodFacts.1': "I grew stronger through this experience",
    'suggestions.default.goodFacts.2': "I'm one step closer to the right person",
    'suggestions.default.lessons.0': "Growth comes from the hardest experiences",
    'suggestions.default.lessons.1': "I deserve better than I accepted",
    'suggestions.default.lessons.2': "Healing is a journey, not a destination",
    'suggestions.kiss.hardTruths.0': "Our kisses lost their meaning over time",
    'suggestions.kiss.hardTruths.1': "I kissed them but felt nothing",
    'suggestions.kiss.hardTruths.2': "The passion we once had faded away",
    'suggestions.kiss.goodFacts.0': "I remember what real connection feels like",
    'suggestions.kiss.goodFacts.1': "I know I deserve passionate, meaningful kisses",
    'suggestions.kiss.goodFacts.2': "Physical intimacy should come from emotional connection",
    'suggestions.kiss.lessons.0': "A kiss should mean something",
    'suggestions.kiss.lessons.1': "Physical connection without emotional connection is empty",
    'suggestions.kiss.lessons.2': "I deserve someone who kisses me like they mean it",
    'suggestions.hug.hardTruths.0': "Their hugs felt distant and forced",
    'suggestions.hug.hardTruths.1': "I hugged them but felt alone",
    'suggestions.hug.hardTruths.2': "The warmth we once shared was gone",
    'suggestions.hug.goodFacts.0': "I remember what genuine comfort feels like",
    'suggestions.hug.goodFacts.1': "I know I deserve warm, meaningful embraces",
    'suggestions.hug.goodFacts.2': "A hug should make you feel safe and loved",
    'suggestions.hug.lessons.0': "Physical touch should convey care",
    'suggestions.hug.lessons.1': "I deserve someone who holds me like they mean it",
    'suggestions.hug.lessons.2': "Comfort comes from genuine connection, not obligation",
    'suggestions.cuddle.hardTruths.0': "Cuddling became a chore, not a comfort",
    'suggestions.cuddle.hardTruths.1': "I felt their distance even when we were close",
    'suggestions.cuddle.hardTruths.2': "The intimacy we shared felt one-sided",
    'suggestions.cuddle.goodFacts.0': "I remember what true closeness feels like",
    'suggestions.cuddle.goodFacts.1': "I know I deserve someone who wants to be close",
    'suggestions.cuddle.goodFacts.2': "Physical closeness should reflect emotional closeness",
    'suggestions.cuddle.lessons.0': "Intimacy requires mutual desire",
    'suggestions.cuddle.lessons.1': "I deserve someone who wants to be near me",
    'suggestions.cuddle.lessons.2': "Closeness should feel natural, not forced",
    'suggestions.morning.hardTruths.0': "Mornings together became awkward and silent",
    'suggestions.morning.hardTruths.1': "I woke up next to them but felt alone",
    'suggestions.morning.hardTruths.2': "The morning light revealed what we'd become",
    'suggestions.morning.goodFacts.0': "I can enjoy peaceful mornings alone now",
    'suggestions.morning.goodFacts.1': "Mornings are a fresh start, a new beginning",
    'suggestions.morning.goodFacts.2': "I'm building a morning routine that's just mine",
    'suggestions.morning.lessons.0': "How you start the day sets the tone",
    'suggestions.morning.lessons.1': "I deserve peaceful, meaningful mornings",
    'suggestions.morning.lessons.2': "A new day means a new chance to heal",
    'suggestions.night.hardTruths.0': "Nights together became lonely and cold",
    'suggestions.night.hardTruths.1': "I lay awake next to them, feeling disconnected",
    'suggestions.night.hardTruths.2': "The darkness couldn't hide our distance",
    'suggestions.night.goodFacts.0': "I can sleep peacefully alone now",
    'suggestions.night.goodFacts.1': "Nights are for rest and restoration",
    'suggestions.night.goodFacts.2': "I'm learning to find peace in the quiet",
    'suggestions.night.lessons.0': "Rest should be restorative, not stressful",
    'suggestions.night.lessons.1': "I deserve peaceful nights and restful sleep",
    'suggestions.night.lessons.2': "The night brings clarity and reflection",
    'suggestions.weekend.hardTruths.0': "Weekends together became obligations, not joys",
    'suggestions.weekend.hardTruths.1': "I spent weekends waiting for them to show up",
    'suggestions.weekend.hardTruths.2': "Our free time together felt wasted",
    'suggestions.weekend.goodFacts.0': "I'm reclaiming my weekends for myself",
    'suggestions.weekend.goodFacts.1': "Weekends are mine to enjoy however I want",
    'suggestions.weekend.goodFacts.2': "I'm discovering new ways to spend my free time",
    'suggestions.weekend.lessons.0': "Free time should be spent with people who value it",
    'suggestions.weekend.lessons.1': "I deserve someone excited to spend weekends with me",
    'suggestions.weekend.lessons.2': "Weekends are for rest, joy, and connection",
    'suggestions.sunset.hardTruths.0': "Sunsets we watched together now remind me of what we lost",
    'suggestions.sunset.hardTruths.1': "The beauty felt empty without real connection",
    'suggestions.sunset.hardTruths.2': "I watched sunsets alone, missing what we had",
    'suggestions.sunset.goodFacts.0': "Sunsets still bring me peace and beauty",
    'suggestions.sunset.goodFacts.1': "I can appreciate nature's beauty on my own",
    'suggestions.sunset.goodFacts.2': "Every sunset is a reminder that endings can be beautiful",
    'suggestions.sunset.lessons.0': "Beauty exists independently of who's beside me",
    'suggestions.sunset.lessons.1': "Endings can be as beautiful as beginnings",
    'suggestions.sunset.lessons.2': "I can find peace in nature's rhythms",
    'suggestions.sunrise.hardTruths.0': "Sunrises we shared are now bittersweet memories",
    'suggestions.sunrise.hardTruths.1': "The new day felt empty without them",
    'suggestions.sunrise.hardTruths.2': "I watched sunrises alone, feeling the loss",
    'suggestions.sunrise.goodFacts.0': "Sunrises represent new beginnings and hope",
    'suggestions.sunrise.goodFacts.1': "Each sunrise is a fresh start",
    'suggestions.sunrise.goodFacts.2': "I can find hope in the dawn of a new day",
    'suggestions.sunrise.lessons.0': "Every sunrise brings new possibilities",
    'suggestions.sunrise.lessons.1': "New beginnings are always possible",
    'suggestions.sunrise.lessons.2': "Hope comes with each new day",
    'suggestions.rain.hardTruths.0': "Rainy days together felt gloomy and sad",
    'suggestions.rain.hardTruths.1': "The rain matched our mood and distance",
    'suggestions.rain.hardTruths.2': "We stayed inside but felt worlds apart",
    'suggestions.rain.goodFacts.0': "Rain can be peaceful and cleansing",
    'suggestions.rain.goodFacts.1': "I can enjoy rainy days alone, finding comfort",
    'suggestions.rain.goodFacts.2': "Rain washes away the old, making way for new growth",
    'suggestions.rain.lessons.0': "Rain can be cleansing and renewing",
    'suggestions.rain.lessons.1': "I can find peace in the sound of rain",
    'suggestions.rain.lessons.2': "Storms pass, and growth follows",
    'suggestions.snow.hardTruths.0': "Snowy days we planned never happened",
    'suggestions.snow.hardTruths.1': "The snow reminded me of coldness between us",
    'suggestions.snow.hardTruths.2': "Winter came but our warmth was gone",
    'suggestions.snow.goodFacts.0': "Snow can be beautiful and peaceful",
    'suggestions.snow.goodFacts.1': "I can enjoy winter's beauty on my own",
    'suggestions.snow.goodFacts.2': "Snow covers everything, giving a fresh start",
    'suggestions.snow.lessons.0': "Beauty exists even in cold times",
    'suggestions.snow.lessons.1': "I can find joy in winter's quiet beauty",
    'suggestions.snow.lessons.2': "Fresh starts come in many forms",
    'suggestions.storm.hardTruths.0': "Storms outside mirrored the storms between us",
    'suggestions.storm.hardTruths.1': "We weathered storms but lost our connection",
    'suggestions.storm.hardTruths.2': "The chaos outside matched our inner turmoil",
    'suggestions.storm.goodFacts.0': "I weathered emotional storms and survived",
    'suggestions.storm.goodFacts.1': "Storms pass, and calm follows",
    'suggestions.storm.goodFacts.2': "I'm stronger for having weathered the storm",
    'suggestions.storm.lessons.0': "Storms reveal what's truly strong",
    'suggestions.storm.lessons.1': "I can weather any storm that comes",
    'suggestions.storm.lessons.2': "After the storm comes peace and clarity",
    'suggestions.breakfast.hardTruths.0': "Breakfast together became silent and awkward",
    'suggestions.breakfast.hardTruths.1': "I ate alone even when they were there",
    'suggestions.breakfast.hardTruths.2': "Morning meals highlighted our distance",
    'suggestions.breakfast.goodFacts.0': "I can enjoy breakfast alone, peacefully",
    'suggestions.breakfast.goodFacts.1': "Breakfast is a simple pleasure I can give myself",
    'suggestions.breakfast.goodFacts.2': "I'm building morning routines that nourish me",
    'suggestions.breakfast.lessons.0': "Simple pleasures don't require company",
    'suggestions.breakfast.lessons.1': "I can find joy in quiet morning moments",
    'suggestions.breakfast.lessons.2': "Self-care starts with simple acts like breakfast",
    'suggestions.dinner.hardTruths.0': "Dinners together became tense and uncomfortable",
    'suggestions.dinner.hardTruths.1': "I cooked for us but ate alone emotionally",
    'suggestions.dinner.hardTruths.2': "Meals became reminders of what we'd lost",
    'suggestions.dinner.goodFacts.0': "I can enjoy cooking and eating for myself",
    'suggestions.dinner.goodFacts.1': "Dinner alone can be peaceful and satisfying",
    'suggestions.dinner.goodFacts.2': "I'm discovering new recipes and flavors",
    'suggestions.dinner.lessons.0': "Food should be enjoyed, not endured",
    'suggestions.dinner.lessons.1': "I can find pleasure in solo dining",
    'suggestions.dinner.lessons.2': "Cooking for myself is an act of self-care",
    'suggestions.email.hardTruths.0': "They never replied to my important emails",
    'suggestions.email.hardTruths.1': "Email communication became one-sided",
    'suggestions.email.hardTruths.2': "I sent messages that were never acknowledged",
    'suggestions.email.goodFacts.0': "I stopped waiting for replies that never came",
    'suggestions.email.goodFacts.1': "I found people who actually respond",
    'suggestions.email.goodFacts.2': "Communication should be mutual, not one-way",
    'suggestions.email.lessons.0': "If they wanted to, they would respond",
    'suggestions.email.lessons.1': "I deserve people who value communication",
    'suggestions.email.lessons.2': "One-way communication isn't communication at all",
    'suggestions.video.hardTruths.0': "Video calls became awkward and forced",
    'suggestions.video.hardTruths.1': "They never wanted to video chat with me",
    'suggestions.video.hardTruths.2': "Seeing their face reminded me of the distance",
    'suggestions.video.goodFacts.0': "I can connect with people who want to see me",
    'suggestions.video.goodFacts.1': "Video calls should be wanted, not forced",
    'suggestions.video.goodFacts.2': "I found people excited to video chat",
    'suggestions.video.lessons.0': "Visual connection should feel natural",
    'suggestions.video.lessons.1': "I deserve someone who wants to see my face",
    'suggestions.video.lessons.2': "Technology can't replace genuine connection",
    'suggestions.spring.hardTruths.0': "Spring brought new life but our relationship was dying",
    'suggestions.spring.hardTruths.1': "The renewal around us highlighted what we'd lost",
    'suggestions.spring.hardTruths.2': "Spring flowers bloomed while we withered",
    'suggestions.spring.goodFacts.0': "Spring represents new beginnings and growth",
    'suggestions.spring.goodFacts.1': "I can find renewal in spring's energy",
    'suggestions.spring.goodFacts.2': "New life is possible, just like spring",
    'suggestions.spring.lessons.0': "Spring teaches that renewal is always possible",
    'suggestions.spring.lessons.1': "I can bloom again, like spring flowers",
    'suggestions.spring.lessons.2': "New beginnings come with each season",
    'suggestions.summer.hardTruths.0': "Summer heat couldn't warm our cold relationship",
    'suggestions.summer.hardTruths.1': "Summer plans we made never happened",
    'suggestions.summer.hardTruths.2': "The warmth of summer highlighted our distance",
    'suggestions.summer.goodFacts.0': "Summer brings energy and adventure",
    'suggestions.summer.goodFacts.1': "I can enjoy summer's warmth on my own",
    'suggestions.summer.goodFacts.2': "Summer is a time for new experiences",
    'suggestions.summer.lessons.0': "I can find joy in summer's energy",
    'suggestions.summer.lessons.1': "Adventure doesn't require a partner",
    'suggestions.summer.lessons.2': "Summer teaches that warmth comes from within",
    'suggestions.winter.hardTruths.0': "Winter's cold matched the chill between us",
    'suggestions.winter.hardTruths.1': "We stayed inside but felt worlds apart",
    'suggestions.winter.hardTruths.2': "Winter holidays highlighted our disconnection",
    'suggestions.winter.goodFacts.0': "Winter can be peaceful and reflective",
    'suggestions.winter.goodFacts.1': "I can find comfort in winter's quiet",
    'suggestions.winter.goodFacts.2': "Winter teaches that rest is necessary",
    'suggestions.winter.lessons.0': "Cold times can be times of growth",
    'suggestions.winter.lessons.1': "I can find warmth even in winter",
    'suggestions.winter.lessons.2': "Rest and reflection are part of healing",
    'suggestions.autumn.hardTruths.0': "Autumn's falling leaves mirrored our falling relationship",
    'suggestions.autumn.hardTruths.1': "The beauty of change highlighted what we'd lost",
    'suggestions.autumn.hardTruths.2': "Autumn came but we couldn't let go",
    'suggestions.autumn.goodFacts.0': "Autumn teaches that letting go can be beautiful",
    'suggestions.autumn.goodFacts.1': "I can find beauty in change and transition",
    'suggestions.autumn.goodFacts.2': "Falling leaves make way for new growth",
    'suggestions.autumn.lessons.0': "Change can be beautiful, not just painful",
    'suggestions.autumn.lessons.1': "Letting go makes room for new growth",
    'suggestions.autumn.lessons.2': "Transitions are part of life's natural cycle",
    'suggestions.goodbye.hardTruths.0': "Our goodbye was harder than it should have been",
    'suggestions.goodbye.hardTruths.1': "I said goodbye but didn't want to let go",
    'suggestions.goodbye.hardTruths.2': "The goodbye revealed what we'd really lost",
    'suggestions.goodbye.goodFacts.0': "I found the strength to say goodbye",
    'suggestions.goodbye.goodFacts.1': "Goodbyes are necessary for new beginnings",
    'suggestions.goodbye.goodFacts.2': "I honored what we had by letting it go",
    'suggestions.goodbye.lessons.0': "Goodbyes can be acts of self-love",
    'suggestions.goodbye.lessons.1': "Letting go is sometimes the kindest choice",
    'suggestions.goodbye.lessons.2': "Endings make room for new beginnings",
    'suggestions.first.hardTruths.0': "Our first times together lost their meaning",
    'suggestions.first.hardTruths.1': "First experiences became last experiences",
    'suggestions.first.hardTruths.2': "The magic of firsts faded too quickly",
    'suggestions.first.goodFacts.0': "I remember the excitement of our firsts",
    'suggestions.first.goodFacts.1': "First experiences taught me what I want",
    'suggestions.first.goodFacts.2': "I'm open to new firsts with the right person",
    'suggestions.first.lessons.0': "Firsts should be special and meaningful",
    'suggestions.first.lessons.1': "I deserve someone who makes firsts memorable",
    'suggestions.first.lessons.2': "The magic of firsts should last",
    'suggestions.last.hardTruths.0': "I didn't know our last time together would be the last",
    'suggestions.last.hardTruths.1': "The last moments revealed what we'd become",
    'suggestions.last.hardTruths.2': "I wish I'd known it was our last time",
    'suggestions.last.goodFacts.0': "I can honor our last moments with grace",
    'suggestions.last.goodFacts.1': "Lasts make way for new firsts",
    'suggestions.last.goodFacts.2': "I'm ready for new experiences",
    'suggestions.last.lessons.0': "Sometimes we don't know when it's the last time",
    'suggestions.last.lessons.1': "I can find peace in accepting endings",
    'suggestions.last.lessons.2': "After the last comes the first of something new",
    'suggestions.together.hardTruths.0': "Being together lost its meaning",
    'suggestions.together.hardTruths.1': "We were together but felt alone",
    'suggestions.together.hardTruths.2': "Togetherness became a burden, not a joy",
    'suggestions.together.goodFacts.0': "I remember what real togetherness feels like",
    'suggestions.together.goodFacts.1': "I know I deserve genuine connection",
    'suggestions.together.goodFacts.2': "Together should mean something real",
    'suggestions.together.lessons.0': "Togetherness requires mutual effort",
    'suggestions.together.lessons.1': "I deserve someone who wants to be together",
    'suggestions.together.lessons.2': "Being together should feel natural, not forced",
    'suggestions.dream.hardTruths.0': "Our shared dreams never came true",
    'suggestions.dream.hardTruths.1': "I dreamed alone while they dreamed differently",
    'suggestions.dream.hardTruths.2': "The future we planned will never happen",
    'suggestions.dream.goodFacts.0': "I can dream new dreams for myself",
    'suggestions.dream.goodFacts.1': "My dreams are still valid and achievable",
    'suggestions.dream.goodFacts.2': "I'm building a future I actually want",
    'suggestions.dream.lessons.0': "Dreams should be shared, not compromised",
    'suggestions.dream.lessons.1': "I can achieve my dreams independently",
    'suggestions.dream.lessons.2': "New dreams can replace old ones",
    'suggestions.laugh.hardTruths.0': "Our laughter together became forced and rare",
    'suggestions.laugh.hardTruths.1': "I laughed alone more than with them",
    'suggestions.laugh.hardTruths.2': "The joy we once shared was gone",
    'suggestions.laugh.goodFacts.0': "I can still find things to laugh about",
    'suggestions.laugh.goodFacts.1': "Laughter is healing and necessary",
    'suggestions.laugh.goodFacts.2': "I'm finding joy in unexpected places",
    'suggestions.laugh.lessons.0': "Laughter should come naturally, not be forced",
    'suggestions.laugh.lessons.1': "I deserve someone who makes me laugh",
    'suggestions.laugh.lessons.2': "Joy is essential to any relationship",
    'suggestions.proposal.hardTruths.0': "The proposal felt forced and expected, not romantic",
    'suggestions.proposal.hardTruths.1': "I said yes but felt uncertain inside",
    'suggestions.proposal.hardTruths.2': "The moment I'd dreamed of felt wrong",
    'suggestions.proposal.goodFacts.0': "I honored my true feelings by being honest",
    'suggestions.proposal.goodFacts.1': "I learned that timing and readiness matter",
    'suggestions.proposal.goodFacts.2': "I can say no to protect my future",
    'suggestions.proposal.lessons.0': "A proposal should feel right, not rushed",
    'suggestions.proposal.lessons.1': "I deserve a proposal that matches my dreams",
    'suggestions.proposal.lessons.2': "Saying no can be an act of self-love",
    'suggestions.engagement.hardTruths.0': "Our engagement period revealed our incompatibility",
    'suggestions.engagement.hardTruths.1': "I felt trapped during what should have been happy",
    'suggestions.engagement.hardTruths.2': "Planning a future together felt wrong",
    'suggestions.engagement.goodFacts.0': "I found the courage to end it before marriage",
    'suggestions.engagement.goodFacts.1': "I learned what I truly want in a partner",
    'suggestions.engagement.goodFacts.2': "I saved myself from a wrong marriage",
    'suggestions.engagement.lessons.0': "Engagement should be a time of joy, not doubt",
    'suggestions.engagement.lessons.1': "It's better to end it before than after marriage",
    'suggestions.engagement.lessons.2': "I deserve someone I'm excited to marry",
    'suggestions.ring.hardTruths.0': "The ring felt like a chain, not a promise",
    'suggestions.ring.hardTruths.1': "I wore it but didn't feel committed",
    'suggestions.ring.hardTruths.2': "The symbol meant more to them than to me",
    'suggestions.ring.goodFacts.0': "I returned the ring and reclaimed my freedom",
    'suggestions.ring.goodFacts.1': "I learned that symbols don't create commitment",
    'suggestions.ring.goodFacts.2': "I'm free to find someone who truly fits",
    'suggestions.ring.lessons.0': "A ring is just a symbol, not a guarantee",
    'suggestions.ring.lessons.1': "True commitment comes from the heart, not jewelry",
    'suggestions.ring.lessons.2': "I deserve someone who wants to commit, not just appear committed",
    'suggestions.divorce.hardTruths.0': "Divorce was harder than I expected",
    'suggestions.divorce.hardTruths.1': "The legal process revealed how far we'd drifted",
    'suggestions.divorce.hardTruths.2': "Ending a marriage felt like failure",
    'suggestions.divorce.goodFacts.0': "I found strength through the hardest process",
    'suggestions.divorce.goodFacts.1': "I'm building a new life that's truly mine",
    'suggestions.divorce.goodFacts.2': "I learned that endings can be beginnings",
    'suggestions.divorce.lessons.0': "Divorce is not failure, it's a new beginning",
    'suggestions.divorce.lessons.1': "I can rebuild my life on my own terms",
    'suggestions.divorce.lessons.2': "Freedom is worth the pain of transition",
    'suggestions.love.hardTruths.0': "I loved them more than they loved me",
    'suggestions.love.hardTruths.1': "Love wasn't enough to save us",
    'suggestions.love.hardTruths.2': "I confused love with attachment",
    'suggestions.love.goodFacts.0': "I learned what real love looks like",
    'suggestions.love.goodFacts.1': "I know I'm capable of deep love",
    'suggestions.love.goodFacts.2': "I'm open to love again, but wiser",
    'suggestions.love.lessons.0': "Love should be mutual, not one-sided",
    'suggestions.love.lessons.1': "Love alone isn't enough without respect and compatibility",
    'suggestions.love.lessons.2': "I deserve someone who loves me as much as I love them",
    'suggestions.interview.hardTruths.0': "The interview didn't go as well as I hoped",
    'suggestions.interview.hardTruths.1': "I felt unprepared and nervous",
    'suggestions.interview.hardTruths.2': "I didn't get the job I wanted",
    'suggestions.interview.goodFacts.0': "I learned from the experience",
    'suggestions.interview.goodFacts.1': "Each interview makes me better",
    'suggestions.interview.goodFacts.2': "I'm building interview skills",
    'suggestions.interview.lessons.0': "Rejection is redirection",
    'suggestions.interview.lessons.1': "Practice makes perfect",
    'suggestions.interview.lessons.2': "The right opportunity will come",
    'suggestions.meeting.hardTruths.0': "Work meetings became stressful and draining",
    'suggestions.meeting.hardTruths.1': "I felt unheard and undervalued in meetings",
    'suggestions.meeting.hardTruths.2': "Meetings highlighted workplace dysfunction",
    'suggestions.meeting.goodFacts.0': "I learned to speak up for myself",
    'suggestions.meeting.goodFacts.1': "I found my voice in professional settings",
    'suggestions.meeting.goodFacts.2': "I'm building confidence in meetings",
    'suggestions.meeting.lessons.0': "My voice matters in professional settings",
    'suggestions.meeting.lessons.1': "I deserve to be heard and valued",
    'suggestions.meeting.lessons.2': "Effective communication is a skill I can develop",
    'suggestions.project.hardTruths.0': "The project didn't turn out as planned",
    'suggestions.project.hardTruths.1': "I took on too much responsibility alone",
    'suggestions.project.hardTruths.2': "Project failures felt personal",
    'suggestions.project.goodFacts.0': "I learned valuable lessons from the experience",
    'suggestions.project.goodFacts.1': "I'm building resilience through challenges",
    'suggestions.project.goodFacts.2': "Each project teaches me something new",
    'suggestions.project.lessons.0': "Failure is part of growth",
    'suggestions.project.lessons.1': "I can learn from setbacks",
    'suggestions.project.lessons.2': "Not every project will succeed, and that's okay",
    'suggestions.office.hardTruths.0': "The office environment was toxic and draining",
    'suggestions.office.hardTruths.1': "I felt isolated and unsupported at work",
    'suggestions.office.hardTruths.2': "Office politics made work unbearable",
    'suggestions.office.goodFacts.0': "I learned what I need in a work environment",
    'suggestions.office.goodFacts.1': "I'm seeking healthier workplaces",
    'suggestions.office.goodFacts.2': "I know my worth in professional settings",
    'suggestions.office.lessons.0': "Work environment matters as much as the work itself",
    'suggestions.office.lessons.1': "I deserve a supportive workplace",
    'suggestions.office.lessons.2': "Toxic environments aren't worth staying in",
    'suggestions.boss.hardTruths.0': "My boss didn't appreciate my work",
    'suggestions.boss.hardTruths.1': "I felt micromanaged and undervalued",
    'suggestions.boss.hardTruths.2': "The relationship with my boss was toxic",
    'suggestions.boss.goodFacts.0': "I learned what good leadership looks like",
    'suggestions.boss.goodFacts.1': "I know I deserve respect from supervisors",
    'suggestions.boss.goodFacts.2': "I'm building boundaries in professional relationships",
    'suggestions.boss.lessons.0': "A good boss should support and develop their team",
    'suggestions.boss.lessons.1': "I deserve respectful professional relationships",
    'suggestions.boss.lessons.2': "I can find better leadership elsewhere",
    'suggestions.colleague.hardTruths.0': "Work colleagues became competitive and unsupportive",
    'suggestions.colleague.hardTruths.1': "I felt excluded from workplace friendships",
    'suggestions.colleague.hardTruths.2': "Colleague relationships were superficial",
    'suggestions.colleague.goodFacts.0': "I learned to set professional boundaries",
    'suggestions.colleague.goodFacts.1': "I found colleagues who value collaboration",
    'suggestions.colleague.goodFacts.2': "I'm building genuine professional relationships",
    'suggestions.colleague.lessons.0': "Work relationships should be professional, not personal",
    'suggestions.colleague.lessons.1': "I deserve supportive colleagues",
    'suggestions.colleague.lessons.2': "Collaboration beats competition",
    'suggestions.fired.hardTruths.0': "Being fired felt like personal failure",
    'suggestions.fired.hardTruths.1': "I lost my job and my confidence",
    'suggestions.fired.hardTruths.2': "The termination was unexpected and painful",
    'suggestions.fired.goodFacts.0': "I learned that being fired isn't a reflection of my worth",
    'suggestions.fired.goodFacts.1': "I found better opportunities after",
    'suggestions.fired.goodFacts.2': "I'm building resilience through career challenges",
    'suggestions.fired.lessons.0': "Being fired can be a blessing in disguise",
    'suggestions.fired.lessons.1': "My worth isn't defined by one job",
    'suggestions.fired.lessons.2': "Better opportunities await after setbacks",
    'suggestions.parent.hardTruths.0': "My parent disappointed me deeply",
    'suggestions.parent.hardTruths.1': "I felt unsupported by my parent",
    'suggestions.parent.hardTruths.2': "The relationship with my parent was strained",
    'suggestions.parent.goodFacts.0': "I learned to set boundaries with family",
    'suggestions.parent.goodFacts.1': "I found support from other family members",
    'suggestions.parent.goodFacts.2': "I'm building healthier family relationships",
    'suggestions.parent.lessons.0': "Parents are human and make mistakes",
    'suggestions.parent.lessons.1': "I can love them while setting boundaries",
    'suggestions.parent.lessons.2': "Family relationships can evolve and heal",
    'suggestions.mother.hardTruths.0': "My mother wasn't there when I needed her",
    'suggestions.mother.hardTruths.1': "I felt judged and misunderstood by my mother",
    'suggestions.mother.hardTruths.2': "Our relationship was more complicated than I wanted",
    'suggestions.mother.goodFacts.0': "I learned to accept her limitations",
    'suggestions.mother.goodFacts.1': "I found motherly support from other women",
    'suggestions.mother.goodFacts.2': "I'm building a relationship on my terms",
    'suggestions.mother.lessons.0': "Mothers are human, not perfect",
    'suggestions.mother.lessons.1': "I can love her while protecting myself",
    'suggestions.mother.lessons.2': "Healing mother-daughter relationships takes time",
    'suggestions.father.hardTruths.0': "My father wasn't present when I needed him",
    'suggestions.father.hardTruths.1': "I felt rejected and unloved by my father",
    'suggestions.father.hardTruths.2': "Our relationship was distant and cold",
    'suggestions.father.goodFacts.0': "I learned to find fatherly support elsewhere",
    'suggestions.father.goodFacts.1': "I found male mentors who supported me",
    'suggestions.father.goodFacts.2': "I'm healing from father wounds",
    'suggestions.father.lessons.0': "Fathers are human and have limitations",
    'suggestions.father.lessons.1': "I can heal without his approval",
    'suggestions.father.lessons.2': "I deserve love and support, with or without him",
    'suggestions.sibling.hardTruths.0': "My sibling and I drifted apart",
    'suggestions.sibling.hardTruths.1': "We had conflicts that never resolved",
    'suggestions.sibling.hardTruths.2': "The sibling bond I wanted never existed",
    'suggestions.sibling.goodFacts.0': "I learned that family bonds aren't automatic",
    'suggestions.sibling.goodFacts.1': "I found chosen family who support me",
    'suggestions.sibling.goodFacts.2': "I'm building relationships that matter",
    'suggestions.sibling.lessons.0': "Blood doesn't guarantee closeness",
    'suggestions.sibling.lessons.1': "I can choose who I consider family",
    'suggestions.sibling.lessons.2': "Healthy relationships require effort from both sides",
    'suggestions.child.hardTruths.0': "My child and I struggled to connect",
    'suggestions.child.hardTruths.1': "I felt like I was failing as a parent",
    'suggestions.child.hardTruths.2': "Parenting revealed my own unresolved issues",
    'suggestions.child.goodFacts.0': "I'm learning and growing as a parent",
    'suggestions.child.goodFacts.1': "I'm breaking generational patterns",
    'suggestions.child.goodFacts.2': "I'm committed to being a better parent",
    'suggestions.child.lessons.0': "Parenting is a journey, not a destination",
    'suggestions.child.lessons.1': "I can heal while parenting",
    'suggestions.child.lessons.2': "Love and effort matter more than perfection",
    'suggestions.reunion.hardTruths.0': "Family reunions highlighted our dysfunction",
    'suggestions.reunion.hardTruths.1': "I felt like an outsider at family gatherings",
    'suggestions.reunion.hardTruths.2': "Reunions reminded me of what we'd lost",
    'suggestions.reunion.goodFacts.0': "I learned to set boundaries at family events",
    'suggestions.reunion.goodFacts.1': "I found family members who truly care",
    'suggestions.reunion.goodFacts.2': "I'm building healthier family connections",
    'suggestions.reunion.lessons.0': "Family gatherings can be navigated with boundaries",
    'suggestions.reunion.lessons.1': "I can choose which family events to attend",
    'suggestions.reunion.lessons.2': "Chosen family can be more supportive than blood",
    'suggestions.bestfriend.hardTruths.0': "My best friend betrayed my trust",
    'suggestions.bestfriend.hardTruths.1': "We grew apart and lost our connection",
    'suggestions.bestfriend.hardTruths.2': "The friendship I thought was forever ended",
    'suggestions.bestfriend.goodFacts.0': "I learned what true friendship looks like",
    'suggestions.bestfriend.goodFacts.1': "I found new friends who value me",
    'suggestions.bestfriend.goodFacts.2': "I'm building deeper, healthier friendships",
    'suggestions.bestfriend.lessons.0': "Friendships can end, and that's okay",
    'suggestions.bestfriend.lessons.1': "I deserve friends who are loyal and supportive",
    'suggestions.bestfriend.lessons.2': "True friendship requires mutual effort",
    'suggestions.hangout.hardTruths.0': "Hanging out became awkward and forced",
    'suggestions.hangout.hardTruths.1': "I felt excluded from friend groups",
    'suggestions.hangout.hardTruths.2': "Social gatherings highlighted our distance",
    'suggestions.hangout.goodFacts.0': "I learned to enjoy my own company",
    'suggestions.hangout.goodFacts.1': "I found friends who actually want to spend time with me",
    'suggestions.hangout.goodFacts.2': "I'm building social connections that feel natural",
    'suggestions.hangout.lessons.0': "Quality matters more than quantity in friendships",
    'suggestions.hangout.lessons.1': "I deserve friends who want to hang out",
    'suggestions.hangout.lessons.2': "Social time should feel good, not forced",
    'suggestions.sport.hardTruths.0': "I gave up on sports I once loved",
    'suggestions.sport.hardTruths.1': "Sports became a source of stress, not joy",
    'suggestions.sport.hardTruths.2': "I felt inadequate compared to others",
    'suggestions.sport.goodFacts.0': "I'm rediscovering the joy of movement",
    'suggestions.sport.goodFacts.1': "Sports are for fun and health, not competition",
    'suggestions.sport.goodFacts.2': "I'm finding activities I truly enjoy",
    'suggestions.sport.lessons.0': "Sports should bring joy, not stress",
    'suggestions.sport.lessons.1': "I can enjoy sports at my own level",
    'suggestions.sport.lessons.2': "Physical activity is about feeling good, not being the best",
    'suggestions.art.hardTruths.0': "I stopped creating art because I felt inadequate",
    'suggestions.art.hardTruths.1': "Art became a source of pressure, not expression",
    'suggestions.art.hardTruths.2': "I compared my art to others and felt inferior",
    'suggestions.art.goodFacts.0': "I'm rediscovering the joy of creating",
    'suggestions.art.goodFacts.1': "Art is about expression, not perfection",
    'suggestions.art.goodFacts.2': "I'm creating for myself, not for approval",
    'suggestions.art.lessons.0': "Art is personal expression, not competition",
    'suggestions.art.lessons.1': "I can create without judgment",
    'suggestions.art.lessons.2': "The process matters more than the product",
    'suggestions.cooking.hardTruths.0': "Cooking became a chore, not a joy",
    'suggestions.cooking.hardTruths.1': "I stopped cooking because I felt unappreciated",
    'suggestions.cooking.hardTruths.2': "Cooking for others felt one-sided",
    'suggestions.cooking.goodFacts.0': "I'm rediscovering the joy of cooking for myself",
    'suggestions.cooking.goodFacts.1': "Cooking is an act of self-care",
    'suggestions.cooking.goodFacts.2': "I'm exploring new recipes and flavors",
    'suggestions.cooking.lessons.0': "Cooking should bring joy, not stress",
    'suggestions.cooking.lessons.1': "I can cook for myself and enjoy it",
    'suggestions.cooking.lessons.2': "Food is about nourishment and pleasure",
    'suggestions.reading.hardTruths.0': "I stopped reading because I felt too busy",
    'suggestions.reading.hardTruths.1': "Reading became a source of guilt, not escape",
    'suggestions.reading.hardTruths.2': "I lost the joy of getting lost in books",
    'suggestions.reading.goodFacts.0': "I'm rediscovering the pleasure of reading",
    'suggestions.reading.goodFacts.1': "Reading is a form of self-care and escape",
    'suggestions.reading.goodFacts.2': "I'm finding books that inspire and heal me",
    'suggestions.reading.lessons.0': "Reading is a gift I can give myself",
    'suggestions.reading.lessons.1': "Books can be healing and transformative",
    'suggestions.reading.lessons.2': "Time for reading is time well spent",
    'suggestions.writing.hardTruths.0': "I stopped writing because I felt unworthy",
    'suggestions.writing.hardTruths.1': "Writing became a source of self-criticism",
    'suggestions.writing.hardTruths.2': "I compared my writing to others and gave up",
    'suggestions.writing.goodFacts.0': "I'm rediscovering the power of writing",
    'suggestions.writing.goodFacts.1': "Writing is healing and therapeutic",
    'suggestions.writing.goodFacts.2': "I'm writing for myself, not for approval",
    'suggestions.writing.lessons.0': "Writing is personal expression, not competition",
    'suggestions.writing.lessons.1': "I can write without judgment",
    'suggestions.writing.lessons.2': "My words have value, regardless of who reads them",
    'suggestions.dance.hardTruths.0': "I stopped dancing because I felt self-conscious",
    'suggestions.dance.hardTruths.1': "Dancing became a source of embarrassment",
    'suggestions.dance.hardTruths.2': "I lost the freedom of movement I once had",
    'suggestions.dance.goodFacts.0': "I'm rediscovering the joy of movement",
    'suggestions.dance.goodFacts.1': "Dancing is about expression, not perfection",
    'suggestions.dance.goodFacts.2': "I'm dancing for myself, not for an audience",
    'suggestions.dance.lessons.0': "Dance is about freedom and expression",
    'suggestions.dance.lessons.1': "I can dance without judgment",
    'suggestions.dance.lessons.2': "Movement is healing and liberating",
    'suggestions.garden.hardTruths.0': "My garden died because I neglected it",
    'suggestions.garden.hardTruths.1': "Gardening became a source of failure",
    'suggestions.garden.hardTruths.2': "I felt inadequate as a gardener",
    'suggestions.garden.goodFacts.0': "I'm learning that gardens can be replanted",
    'suggestions.garden.goodFacts.1': "Gardening teaches patience and growth",
    'suggestions.garden.goodFacts.2': "I'm starting fresh with new plants",
    'suggestions.garden.lessons.0': "Gardens can be replanted and renewed",
    'suggestions.garden.lessons.1': "Growth takes time and patience",
    'suggestions.garden.lessons.2': "Every plant teaches me something new",
    'suggestions.airport.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.airport.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.airport.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.airport.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.airport.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.airport.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.anniversary.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.anniversary.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.anniversary.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.anniversary.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.anniversary.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.anniversary.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.apology.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.apology.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.apology.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.apology.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.apology.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.apology.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.art.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.art.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.art.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.art.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.art.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.art.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.autumn.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.autumn.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.autumn.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.autumn.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.autumn.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.autumn.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.beach.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.beach.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.beach.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.beach.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.beach.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.beach.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.bestfriend.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.bestfriend.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.bestfriend.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.bestfriend.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.bestfriend.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.bestfriend.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.birthday.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.birthday.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.birthday.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.birthday.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.birthday.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.birthday.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.boss.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.boss.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.boss.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.boss.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.boss.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.boss.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.breakfast.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.breakfast.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.breakfast.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.breakfast.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.breakfast.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.breakfast.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.breakup.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.breakup.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.breakup.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.breakup.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.breakup.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.breakup.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.call.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.call.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.call.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.call.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.call.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.call.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.car.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.car.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.car.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.car.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.car.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.car.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.cheat.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.cheat.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.cheat.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.cheat.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.cheat.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.cheat.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.child.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.child.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.child.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.child.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.child.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.child.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.christmas.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.christmas.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.christmas.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.christmas.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.christmas.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.christmas.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.coffee.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.coffee.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.coffee.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.coffee.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.coffee.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.coffee.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.colleague.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.colleague.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.colleague.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.colleague.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.colleague.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.colleague.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.concert.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.concert.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.concert.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.concert.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.concert.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.concert.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.cooking.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.cooking.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.cooking.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.cooking.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.cooking.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.cooking.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.cuddle.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.cuddle.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.cuddle.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.cuddle.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.cuddle.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.cuddle.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.dance.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.dance.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.dance.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.dance.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.dance.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.dance.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.date.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.date.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.date.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.date.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.date.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.date.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.default.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.default.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.default.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.default.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.default.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.default.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.dinner.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.dinner.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.dinner.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.dinner.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.dinner.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.dinner.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.divorce.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.divorce.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.divorce.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.divorce.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.divorce.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.divorce.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.dream.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.dream.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.dream.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.dream.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.dream.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.dream.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.email.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.email.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.email.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.email.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.email.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.email.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.engagement.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.engagement.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.engagement.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.engagement.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.engagement.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.engagement.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.family.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.family.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.family.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.family.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.family.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.family.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.father.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.father.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.father.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.father.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.father.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.father.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.fight.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.fight.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.fight.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.fight.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.fight.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.fight.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.fired.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.fired.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.fired.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.fired.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.fired.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.fired.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.first.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.first.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.first.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.first.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.first.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.first.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.friend.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.friend.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.friend.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.friend.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.friend.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.friend.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.game.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.game.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.game.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.game.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.game.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.game.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.garden.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.garden.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.garden.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.garden.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.garden.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.garden.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.gift.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.gift.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.gift.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.gift.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.gift.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.gift.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.goodbye.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.goodbye.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.goodbye.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.goodbye.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.goodbye.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.goodbye.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.graduation.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.graduation.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.graduation.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.graduation.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.graduation.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.graduation.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.gym.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.gym.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.gym.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.gym.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.gym.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.gym.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.hangout.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.hangout.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.hangout.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.hangout.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.hangout.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.hangout.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.holiday.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.holiday.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.holiday.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.holiday.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.holiday.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.holiday.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.home.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.home.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.home.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.home.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.home.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.home.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.hospital.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.hospital.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.hospital.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.hospital.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.hospital.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.hospital.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.hug.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.hug.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.hug.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.hug.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.hug.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.hug.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.illness.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.illness.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.illness.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.illness.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.illness.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.illness.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.interview.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.interview.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.interview.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.interview.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.interview.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.interview.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.kiss.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.kiss.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.kiss.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.kiss.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.kiss.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.kiss.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.lake.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.lake.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.lake.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.lake.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.lake.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.lake.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.last.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.last.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.last.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.last.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.last.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.last.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.laugh.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.laugh.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.laugh.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.laugh.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.laugh.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.laugh.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.lie.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.lie.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.lie.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.lie.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.lie.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.lie.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.love.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.love.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.love.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.love.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.love.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.love.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.meeting.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.meeting.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.meeting.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.meeting.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.meeting.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.meeting.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.money.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.money.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.money.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.money.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.money.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.money.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.morning.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.morning.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.morning.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.morning.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.morning.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.morning.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.mother.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.mother.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.mother.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.mother.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.mother.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.mother.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.mountain.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.mountain.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.mountain.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.mountain.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.mountain.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.mountain.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.move.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.move.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.move.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.move.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.move.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.move.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.movie.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.movie.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.movie.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.movie.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.movie.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.movie.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.music.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.music.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.music.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.music.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.music.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.music.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.night.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.night.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.night.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.night.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.night.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.night.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.office.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.office.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.office.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.office.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.office.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.office.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.parent.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.parent.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.parent.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.parent.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.parent.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.parent.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.park.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.park.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.park.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.park.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.park.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.park.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.party.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.party.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.party.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.party.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.party.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.party.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.pet.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.pet.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.pet.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.pet.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.pet.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.pet.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.photo.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.photo.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.photo.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.photo.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.photo.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.photo.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.project.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.project.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.project.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.project.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.project.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.project.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.promise.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.promise.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.promise.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.promise.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.promise.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.promise.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.promotion.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.promotion.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.promotion.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.promotion.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.promotion.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.promotion.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.proposal.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.proposal.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.proposal.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.proposal.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.proposal.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.proposal.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.rain.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.rain.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.rain.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.rain.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.rain.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.rain.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.reading.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.reading.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.reading.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.reading.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.reading.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.reading.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.restaurant.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.restaurant.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.restaurant.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.restaurant.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.restaurant.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.restaurant.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.reunion.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.reunion.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.reunion.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.reunion.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.reunion.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.reunion.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.ring.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.ring.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.ring.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.ring.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.ring.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.ring.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.sand.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.sand.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.sand.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.sand.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.sand.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.sand.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.school.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.school.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.school.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.school.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.school.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.school.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.shopping.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.shopping.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.shopping.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.shopping.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.shopping.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.shopping.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.sibling.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.sibling.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.sibling.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.sibling.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.sibling.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.sibling.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.snow.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.snow.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.snow.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.snow.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.snow.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.snow.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.sport.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.sport.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.sport.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.sport.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.sport.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.sport.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.spring.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.spring.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.spring.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.spring.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.spring.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.spring.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.storm.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.storm.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.storm.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.storm.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.storm.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.storm.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.summer.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.summer.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.summer.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.summer.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.summer.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.summer.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.sunrise.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.sunrise.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.sunrise.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.sunrise.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.sunrise.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.sunrise.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.sunset.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.sunset.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.sunset.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.sunset.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.sunset.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.sunset.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.text.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.text.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.text.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.text.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.text.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.text.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.together.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.together.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.together.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.together.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.together.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.together.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.travel.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.travel.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.travel.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.travel.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.travel.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.travel.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.trip.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.trip.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.trip.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.trip.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.trip.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.trip.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.trust.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.trust.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.trust.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.trust.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.trust.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.trust.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.vacation.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.vacation.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.vacation.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.vacation.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.vacation.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.vacation.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.video.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.video.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.video.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.video.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.video.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.video.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.walk.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.walk.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.walk.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.walk.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.walk.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.walk.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.wedding.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.wedding.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.wedding.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.wedding.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.wedding.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.wedding.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.weekend.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.weekend.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.weekend.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.weekend.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.weekend.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.weekend.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.winter.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.winter.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.winter.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.winter.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.winter.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.winter.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.work.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.work.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.work.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.work.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.work.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.work.lessons.4': "I'm stronger and wiser because of this experience",
    'suggestions.writing.hardTruths.3': "I faced challenges that revealed deeper truths about this situation",
    'suggestions.writing.hardTruths.4': "The reality was harder than I wanted to admit",
    'suggestions.writing.goodFacts.3': "I discovered strength I didn't know I had",
    'suggestions.writing.goodFacts.4': "This experience taught me valuable lessons about myself",
    'suggestions.writing.lessons.3': "Growth comes from facing difficult truths",
    'suggestions.writing.lessons.4': "I'm stronger and wiser because of this experience",
  },
  bg: {
    // Tab labels
    'tab.home': 'Начало',
    'tab.exProfiles': 'Партньори',
    'tab.spheres': 'Sferas',
    'tab.settings': 'Настройки',
    'home.emptyState': 'Няма профили все още. Добавете първи партньор, за да започнете.',
    
    // Settings
    'settings.title': 'Настройки',
    'settings.language': 'Език',
    'settings.language.description': 'Изберете предпочитания език',
    'settings.language.english': 'Английски',
    'settings.language.bulgarian': 'Български',
    'settings.theme': 'Тема',
    'settings.theme.description': 'Изберете предпочитана тема',
    'settings.theme.light': 'Светла',
    'settings.theme.dark': 'Тъмна',
    'settings.theme.system': 'Системна',
    'settings.devTools.generateData.success': 'Създадени {profiles} профили и {jobs} работни места с общо {memories} спомени!\n\nВсички данни са запазени в локалното хранилище. Навигирайте до раздела Сфери, за да видите вашите данни.',
    'settings.devTools.generateData.error': 'Неуспешно генериране на фалшиви данни. Моля, опитайте отново.',
    'settings.devTools.clearData.title': 'Изтриване на всички данни на приложението',
    'settings.devTools.clearData.message': 'Сигурни ли сте, че искате да изтриете ВСИЧКИ данни от това приложение? Това ще премахне:\n\n• Всички профили/партньори\n• Всички работни места\n• Всички спомени\n• Всички членове на семейството\n• Всички позиции на аватари\n\nТова действие не може да бъде отменено.\n\nВашите настройки за тема и език ще бъдат запазени.',
    'settings.devTools.clearData.deleteButton': 'Изтрий Всички Данни',
    'settings.devTools.clearData.success': 'Всички данни на приложението са изтрити от локалното хранилище.\n\nПриложението сега ще показва 0% и няма профили/работни места/спомени.\n\nМоля, навигирайте навън и обратно до раздела Сфери/Начало, за да видите промените, отразени в потребителския интерфейс.',
    'settings.devTools.clearData.error': 'Неуспешно изтриване на данните на приложението. Моля, опитайте отново.',
    'settings.devTools.cleanupMemories.button': 'Изчисти изолирани спомени',
    'settings.devTools.cleanupMemories.success.withCount': 'Изчистени са {count} изолирани спомена.',
    'settings.devTools.cleanupMemories.success.noOrphans': 'Не са намерени изолирани спомени. Всички спомени са валидни.',
    'settings.devTools.cleanupMemories.error': 'Неуспешно изчистване на изолираните спомени. Моля, опитайте отново.',
    'settings.notifications.title': 'Известия',
    'settings.notifications.manage': 'Управление на известия',
    'settings.devTools.title': 'Инструменти за Разработка',
    'settings.devTools.generateData.button': 'Генериране на Фалшиви Данни (Профили и Работи)',
    'settings.devTools.generateData.generating': 'Генериране...',
    'settings.devTools.clearData.button': 'Изтриване на Всички Данни',
    'settings.devTools.clearData.deleting': 'Изтриване...',
    'wheel.noLessons.message': 'Добавете уроци към вашите спомени, за да ги видите тук и да ги практикувате!',
    'wheel.noHardTruths.message': 'Добавете трудни истини към вашите спомени, за да ги видите тук!',
    'wheel.noSunnyMoments.message': 'Добавете слънчеви моменти към вашите спомени, за да ги видите тук!',
    'wheel.spinForRandom': 'Завъртете колелото',

    // Streak Rules Modal
    'streakRules.title': 'Как Работят Поредиците',
    'streakRules.badges.title': 'Значки за Поредица',
    'streakRules.badges.subtitle': 'Значките отразяват вашите последователни дни. По-високи поредици отключват по-добри значки!',
    'streakRules.badge.requires': 'Изисква',
    'streakRules.badge.requires.day': 'ден',
    'streakRules.badge.requires.days': 'дни',
    'streakRules.rarity.common': 'ОБИКНОВЕНА',
    'streakRules.rarity.rare': 'РЯДКА',
    'streakRules.rarity.epic': 'ЕПИЧНА',
    'streakRules.rarity.legendary': 'ЛЕГЕНДАРНА',
    'streakRules.badge.spark.name': 'Искра',
    'streakRules.badge.spark.description': 'Първа стъпка в вашето пътешествие',
    'streakRules.badge.flame.name': 'Пламен',
    'streakRules.badge.flame.description': '3 дни последователен растеж',
    'streakRules.badge.keeper.name': 'Пазител',
    'streakRules.badge.keeper.description': '1 седмица отдаденост',
    'streakRules.badge.champion.name': 'Шампион',
    'streakRules.badge.champion.description': '2 седмици силно',
    'streakRules.badge.warrior.name': 'Воин',
    'streakRules.badge.warrior.description': '1 месец ангажираност',
    'streakRules.badge.legend.name': 'Легенда',
    'streakRules.badge.legend.description': '2 месеца майсторство',
    'streakRules.badge.titan.name': 'Титан',
    'streakRules.badge.titan.description': '100-дневна постижение',
    'streakRules.badge.immortal.name': 'Безсмъртен',
    'streakRules.badge.immortal.description': '1 година шампион',
    'streak.badge.day': 'ден',
    'streak.badge.days': 'дни',
    'streak.modal.title': 'Вашата Поредица 🔥',
    'streak.modal.currentStreak': 'Текуща Поредица',
    'streak.modal.longestStreak': 'Най-дълга Поредица',
    'streak.modal.totalDays': 'Общо Дни',
    'streak.modal.badgesEarned': 'Получени Значки',
    'streak.modal.nextBadge': 'Следваща Значка',
    'streak.modal.daysToGo': 'остават!',
    'streak.modal.badgeCollection': 'Колекция от Значки',
    'streak.modal.startJourney': 'Започнете вашето пътешествие',
    'streak.modal.motivation.start': 'Започнете вашето пътешествие днес! Запишете момент, за да започнете поредицата си 🌱',
    'streak.modal.motivation.building': 'Изграждате навик! Продължете 💪',
    'streak.modal.motivation.progress': 'Отличен прогрес! Формирате мощен навик ⭐',
    'streak.modal.motivation.consistency': 'Невероятна последователност! Овладявате саморефлексията 🔥',
    'streak.modal.motivation.legend': 'Вие сте легенда! Вашата отдаденост е вдъхновяваща 👑',
    
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
    'common.ok': 'ОК',
    'common.success': 'Успех',
    'common.done': 'Готово',
    'common.error': 'Грешка',
    'common.optional': 'Незадължително',
    'common.discard': 'Отхвърли',
    'memory.unsavedChanges.title': 'Незапазени промени',
    'memory.unsavedChanges.message': 'Имате незапазени промени. Сигурни ли сте, че искате да напуснете? Промените ви ще бъдат загубени.',
    'walkthrough.title': 'Добре дошли!',
    'walkthrough.message': 'Създайте записи във всяка сфера, за да проследявате облачните и слънчевите моменти от живота си. Започнете като добавите партньор, работа, член на семейството, приятел или хоби!',
    'walkthrough.button': 'Разбрах!',
    
    // Profile screens
    'profile.add': 'Добави Партньор',
    'profile.edit': 'Редактирай Профил',
    'profile.editExInfo': 'Редактирай Информация',
    'profile.editMemories': 'Редактирай Спомени',
    'profile.editProfile': 'Редактирай Профил',
    'profile.editProfile.description': 'Изберете какво искате да редактирате за този профил.',
    'profile.name': 'Име',
    'profile.exPartnerName': 'Име на Партньор',
    'profile.exPartnerName.placeholder': 'Въведете името им',
    'profile.description': 'Описание',
    'profile.description.placeholder': 'Въведете кратко описание (макс. 30 символа)',
    'profile.description.example': 'напр. Студентска любов, първа любов...',
    'profile.uploadPicture': 'Добави Снимка',
    'profile.changePicture': 'Промени Снимка',
    'profile.openingGallery': 'Отваряне на галерия...',
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
    'profile.emptyState.button': 'Добави Първия Партньор',
    'profile.actionSheet.edit': 'Редактирай Профил',
    'profile.actionSheet.viewHealingPath': 'Виж Пътя на Изцеление',
    'profile.actionSheet.delete': 'Изтрий Профил',
    'profile.setup.complete': 'Настройка Завършена',
    'profile.setup.incomplete': 'Незавършена Настройка ({percentage}%)',
    'profile.relationship': 'Връзка',
    'profile.ongoing.error.title': 'Не може да се зададе като текуща',
    'profile.ongoing.error.message': 'Вече има текуща връзка. Моля, приключете текущата връзка, преди да започнете нова.',
    'profile.ongoing.warning': 'Вече има текуща връзка',
    'profile.date.error.endBeforeStart': 'Датата на приключване не може да бъде преди датата на започване.',
    'profile.date.error.startAfterEnd': 'Датата на започване не може да бъде след датата на приключване.',
    'profile.relationshipStartDate': 'Начална Дата на Връзката',
    'profile.relationshipStartDate.select': 'Изберете начална дата',
    'profile.relationshipStartDate.selectTitle': 'Изберете Начална Дата',
    'profile.relationshipEndDate': 'Крайна Дата на Връзката',
    'profile.relationshipEndDate.select': 'Изберете крайна дата',
    'profile.relationshipEndDate.selectTitle': 'Изберете Крайна Дата',
    'profile.relationshipOngoing': 'Връзката е текуща',
    'profile.familyMemberName': 'Име на Член на Семейството',
    'profile.familyMemberName.placeholder': 'Въведете името им',
    'profile.relationshipType': 'Тип Връзка',
    'profile.relationshipType.placeholder': 'напр. Майка, Баща, Сестра...',
    'profile.addFamilyMember': 'Добави Член на Семейството',
    'profile.editFamilyMember': 'Редактирай Член на Семейството',
    'profile.editFamilyInfo': 'Редактирай Информация',
    'profile.editFriendInfo': 'Редактирай Информация',
    'profile.editHobbyInfo': 'Редактирай Информация',
    'profile.familyEmptyState.title': 'Все още няма членове на семейството',
    'profile.familyEmptyState.description': 'Започнете да проследявате семейните си връзки',
    'profile.familyEmptyState.button': 'Добави Член на Семейството',
    'profile.familyDelete.confirm': 'Изтрий Член на Семейството',
    'profile.familyDelete.confirm.message': 'Сигурни ли сте, че искате да изтриете този член на семейството? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.familyDelete.confirm.message.withName': 'Сигурни ли сте, че искате да изтриете "{name}"? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.familyActionSheet.edit': 'Редактирай',
    'profile.familyActionSheet.delete': 'Изтрий',
    'profile.friendName': 'Име на Приятел',
    'profile.friendName.placeholder': 'Въведете името им',
    'profile.addFriend': 'Добави Приятел',
    'profile.addFriend.description': 'Добавете приятел, за да проследявате моментите от вашата връзка',
    'profile.editFriend': 'Редактирай Приятел',
    'profile.editFriend.description': 'Актуализирайте информацията за вашия приятел',
    'profile.friendEmptyState.title': 'Все още няма приятели',
    'profile.friendEmptyState.description': 'Започнете да проследявате вашите приятелства',
    'profile.friendEmptyState.button': 'Добави Приятел',
    'profile.friendDelete.confirm': 'Изтрий Приятел',
    'profile.friendDelete.confirm.message': 'Сигурни ли сте, че искате да изтриете този приятел? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.friendDelete.confirm.message.withName': 'Сигурни ли сте, че искате да изтриете "{name}"? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.friendActionSheet.edit': 'Редактирай',
    'profile.friendActionSheet.delete': 'Изтрий',
    'profile.friend.name.required': 'Името е задължително',
    'profile.hobbyName': 'Име на Хоби',
    'profile.hobbyName.placeholder': 'Въведете име на хоби',
    'profile.addHobby': 'Добави Хоби',
    'profile.addHobby.description': 'Добавете хоби, за да проследявате моментите от вашата дейност',
    'profile.editHobby': 'Редактирай Хоби',
    'profile.editHobby.description': 'Актуализирайте информацията за вашето хоби',
    'profile.hobbyEmptyState.title': 'Все още няма хобита',
    'profile.hobbyEmptyState.description': 'Започнете да проследявате вашите хобита',
    'profile.hobbyEmptyState.button': 'Добави Хоби',
    'profile.hobbyDelete.confirm': 'Изтрий Хоби',
    'profile.hobbyDelete.confirm.message': 'Сигурни ли сте, че искате да изтриете това хоби? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.hobbyDelete.confirm.message.withName': 'Сигурни ли сте, че искате да изтриете "{name}"? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'profile.hobbyActionSheet.edit': 'Редактирай',
    'profile.hobbyActionSheet.delete': 'Изтрий',
    'profile.hobby.name.required': 'Името е задължително',
    'job.addJob': 'Добави Работно Място',
    'job.editJob': 'Редактирай Работно Място',
    'job.editJobInfo': 'Редактирай Информация',
    'job.jobTitle': 'Длъжност',
    'job.jobTitle.placeholder': 'Въведете длъжност',
    'job.companyName': 'Име на Фирма',
    'job.companyName.placeholder': 'Въведете име на фирма',
    'job.jobDescription': 'Описание на Работата',
    'job.jobDescription.placeholder': 'Въведете кратко описание',
    'job.jobEmptyState.title': 'Все още няма работни места',
    'job.jobEmptyState.description': 'Започнете да проследявате кариерното си пътешествие',
    'job.jobEmptyState.button': 'Добави Работно Място',
    'job.jobDelete.confirm': 'Изтрий Работно Място',
    'job.jobDelete.confirm.message': 'Сигурни ли сте, че искате да изтриете това работно място? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'job.jobDelete.confirm.message.withName': 'Сигурни ли сте, че искате да изтриете "{name}"? Това ще изтрие постоянно всички свързани спомени и данни. Това действие не може да бъде отменено.',
    'job.jobActionSheet.edit': 'Редактирай',
    'job.jobActionSheet.delete': 'Изтрий',
    'spheres.title': 'Сфери',
    'spheres.encouragement.general': 'Имате много прекрасни моменти в живота си. Отделете време да ги насладите и оцените!',
    'spheres.encouragement.goodMomentsPrevail': 'Чудесно! Добрите моменти преобладават в живота ви. Оценете и приемете позитивните преживявания, които сте създали! ✨',
    'spheres.encouragement.keepPushing': 'Продължавайте напред, въпреки че е трудно! Помислете да се срещнете с семейство или приятели, или да опитате ново хоби, за да създадете повече слънчеви моменти в живота си. 💪',
    'spheres.encouragement.calculating': 'Анализиране на вашите моменти',
    'spheres.wheelOfLife.lessonLearned': 'Урок от Колелото на Живота',
    'spheres.relationships': 'Връзки',
    'spheres.career': 'Кариера',
    'spheres.family': 'Семейство',
    'spheres.friends': 'Приятели',
    'spheres.hobbies': 'Хобита',
    'spheres.item': 'елемент',
    'spheres.items': 'елемента',
    
    // Insights
    'insights.wheelOfLife.title': 'Прозрения',
    'insights.wheelOfLife.subtitle': 'Анализирайте жизнения си баланс в различните сфери',
    'insights.wheelOfLife.distributionExplanation': 'Процентите показват колко време отделяте на всяка сфера по отношение на общите моменти. Те представляват пропорцията на всичките ви моменти, които принадлежат на всяка сфера, в сравнение с останалите.',
    'insights.wheelOfLife.percentageExplanation': 'Процентите представляват пропорцията на слънчеви (позитивни) моменти спрямо облачни (трудни) моменти във всички обекти в всяка сфера. По-висок процент означава повече позитивни преживявания.',
    'insights.recommendations.title': 'Препоръки',
    'insights.relationships.critical': 'Сферата на връзките ви се нуждае от спешно внимание. Фокусирайте се върху създаването на положителни спомени и решаването на предизвикателства.',
    'insights.relationships.needsImprovement': 'Сферата на връзките ви може да се подобри с повече положителни моменти. Помислете за фокусиране върху изграждането на по-силни връзки.',
    'insights.relationships.strength': 'Сферата на връзките ви е сила! Продължете да поддържате тези връзки.',
    'insights.career.critical': 'Сферата на кариерата ви се нуждае от спешно внимание. Фокусирайте се върху създаването на положителни преживявания и решаването на работни предизвикателства.',
    'insights.career.needsImprovement': 'Сферата на кариерата ви може да се подобри с повече положителни моменти. Помислете за фокусиране върху професионално развитие и удовлетворение.',
    'insights.career.strength': 'Сферата на кариерата ви е сила! Продължете да градите върху професионалния си успех.',
    'insights.family.critical': 'Сферата на семейството ви се нуждае от спешно внимание. Фокусирайте се върху създаването на положителни спомени и укрепването на семейни взаимоотношения.',
    'insights.family.needsImprovement': 'Сферата на семейството ви може да се подобри с повече положителни моменти. Помислете за фокусиране върху семейните отношения и взаимоотношения.',
    'insights.family.strength': 'Сферата на семейството ви е сила! Продължете да поддържате тези важни взаимоотношения.',
    'insights.relationships.current.low': 'Само {percentage}% от моментите в текущата ви връзка с {name} са слънчеви (останалите са облачни).',
    'insights.relationships.pattern.current': 'Само {percentage}% от моментите в текущата ви връзка с {name} са слънчеви.',
    'insights.career.current.low': 'Само {percentage}% от моментите в текущата ви работа в {name} са положителни (останалите са предизвикателни).',
    'insights.career.pattern.current': 'Само {percentage}% от моментите в текущата ви работа в {name} са положителни.',
    'insights.family.member.low': 'Само {percentage}% от моментите с {name} са положителни (останалите са предизвикателни).',
    'insights.family.pattern': 'Само {percentage}% от моментите с {name} са положителни.',
    'insights.comparison.currentRelationships': 'Текущи Връзки',
    'insights.comparison.pastRelationships': 'Минали Връзки',
    'insights.comparison.currentJobs': 'Текущи Работни Места',
    'insights.comparison.pastJobs': 'Предишни Работни Места',
    'insights.comparison.label.current': 'Текуща',
    'insights.comparison.label.ex': 'Бивша',
    'insights.comparison.label.past': 'Минала',
    'insights.comparison.familyMembers': 'Семейни Членове',
    'insights.comparison.relationships.title': 'Сравнение на Връзките',
    'insights.comparison.relationships.chartTitle': 'Как Слънчевите и Облачните Моменти Се Променят При Партньорите',
    'insights.comparison.relationships.subtitle': 'Общо количество моменти',
    'insights.comparison.relationships.goodMoments': 'Слънчеви Факти',
    'insights.comparison.relationships.badMoments': 'Облачни Моменти',
    'insights.comparison.relationships.you': 'Ти',
    'insights.comparison.relationships.partner': 'Партньор',
    'insights.comparison.relationships.cloudyLabel': 'О',
    'insights.comparison.relationships.facts': 'Факта',
    'insights.comparison.relationships.warning.lower': 'Текущият ви партньор има по-ниска пропорция на слънчеви моменти в сравнение с миналите ви връзки. Помислете какво може да причинява тази разлика.',
    'insights.comparison.relationships.warning.close': 'Текущата ви връзка има подобна пропорция на слънчеви моменти като миналите ви връзки. Това може да е модел, който си заслужава да разгледате.',
    'insights.comparison.relationships.kudos': 'Отличен прогрес! Текущата ви връзка има значително повече слънчеви моменти в сравнение с миналите ви връзки. Продължавайте да подхранвате тази позитивна връзка!',
    'insights.comparison.relationships.percentageExplanationTitle': 'Какво означава този процент?',
    'insights.comparison.relationships.percentageExplanation': 'Процентът от {percentage}% представлява пропорцията на слънчеви (позитивни) моменти спрямо облачни (трудни) моменти. По-висок процент означава повече записани позитивни преживявания.',
    'insights.comparison.relationships.totalMoments': 'Общо Моменти',
    'insights.comparison.relationships.quality': 'слънчеви',
    'insights.comparison.relationships.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение на връзките.',
    'insights.comparison.relationships.sphereComparison.moreRelationshipTime': 'Връзките преобладават в живота ви, с значително повече записани моменти в сравнение с кариерата. Личните ви връзки са приоритет.',
    'insights.comparison.relationships.sphereComparison.moreCareerTime': 'Кариерата преобладава в живота ви, с значително повече записани моменти в сравнение с връзките. Помислете за балансиране на фокуса между работа и лични връзки.',
    'insights.comparison.relationships.sphereComparison.balancedTime': 'Имате приблизително балансирано разпределение на работа и личен живот между връзки и кариера.',
    'insights.comparison.relationships.sphereComparison.betterRelationshipQuality': 'Вашите връзки имат значително по-добро качество (повече слънчеви моменти) в сравнение с кариерата ви. Отлична работа в поддържането на връзките!',
    'insights.comparison.relationships.sphereComparison.betterCareerQuality': 'Вашата кариера има значително по-добро качество (повече слънчеви моменти) в сравнение с връзките ви. Помислете да се фокусирате повече върху изграждането на позитивни връзки.',
    'insights.comparison.general.balance': 'Не забравяйте да се стремите към баланс в живота. Никоя сфера не трябва да остане изоставена - грижата за всички аспекти на живота ви допринася за общото благополучие.',
    'insights.comparison.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение.',
    'insights.comparison.career.title': 'Сравнение на Кариера',
    'insights.comparison.career.chartTitle': 'Как Слънчевите и Облачните Моменти Се Променят При Работите',
    'insights.comparison.career.subtitle': 'Общо количество моменти',
    'insights.comparison.career.goodMoments': 'Слънчеви Факти',
    'insights.comparison.career.badMoments': 'Облачни Моменти',
    'insights.comparison.career.warning.lower': 'Текущата ви работа има по-ниска пропорция на слънчеви моменти в сравнение с миналите ви работи. Помислете какво може да причинява тази разлика.',
    'insights.comparison.career.warning.close': 'Текущата ви работа има подобна пропорция на слънчеви моменти като миналите ви работи. Това може да е модел, който си заслужава да разгледате.',
    'insights.comparison.career.kudos': 'Отличен прогрес! Текущата ви работа има значително повече слънчеви моменти в сравнение с миналите ви работи. Продължавайте да подхранвате това позитивно преживяване!',
    'insights.comparison.career.percentageExplanationTitle': 'Какво означава този процент?',
    'insights.comparison.career.percentageExplanation': 'Процентът от {percentage}% представлява пропорцията на слънчеви (позитивни) моменти спрямо облачни (трудни) моменти във всички ваши кариерни преживявания. По-висок процент означава повече записани позитивни преживявания.',
    'insights.comparison.career.totalMoments': 'Общо Моменти',
    'insights.comparison.career.quality': 'слънчеви',
    'insights.comparison.career.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение на кариерата.',
    'insights.comparison.career.sphereComparison.moreCareerTime': 'Кариерата преобладава в живота ви, с значително повече записани моменти в сравнение с връзките. Помислете за балансиране на фокуса между работа и лични връзки.',
    'insights.comparison.career.sphereComparison.moreRelationshipTime': 'Връзките преобладават в живота ви, с значително повече записани моменти в сравнение с кариерата. Личните ви връзки са приоритет.',
    'insights.comparison.career.sphereComparison.balancedTime': 'Имате приблизително балансирано разпределение на работа и личен живот между кариера и връзки.',
    'insights.comparison.career.sphereComparison.betterCareerQuality': 'Вашата кариера има значително по-добро качество (повече слънчеви моменти) в сравнение с връзките ви. Помислете да се фокусирате повече върху изграждането на позитивни връзки.',
    'insights.comparison.career.sphereComparison.betterRelationshipQuality': 'Вашите връзки имат значително по-добро качество (повече слънчеви моменти) в сравнение с кариерата ви. Отлична работа в поддържането на връзките!',
    'insights.comparison.family.title': 'Семейство',
    'insights.comparison.family.subtitle': 'Общо количество моменти',
    'insights.comparison.family.totalMoments': 'Общи Моменти',
    'insights.comparison.family.quality': 'Качество на Моментите',
    'insights.comparison.family.sunny': 'Слънчеви',
    'insights.comparison.family.cloudy': 'Облачни',
    'insights.comparison.family.noData': 'Няма налични данни за сравнение',
    'insights.comparison.family.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение на семейството.',
    'insights.comparison.family.insight.moreFamilyTime': 'Отделяте повече време за семейството, отколкото за кариерата.',
    'insights.comparison.family.insight.moreCareerTime': 'Отделяте повече време за кариерата, отколкото за семейството. Помислете да намерите повече време за семейни моменти.',
    'insights.comparison.family.insight.balancedTime': 'Имате добре балансирано разпределение на времето между семейство и кариера.',
    'insights.comparison.family.insight.betterFamilyQuality': 'Вашите семейни моменти имат значително по-добро качество от кариерните моменти. Това показва силни семейни взаимоотношения!',
    'insights.comparison.family.insight.betterCareerQuality': 'Вашите кариерни моменти имат по-добро качество от семейните моменти. Помислете да подхранвате повече положителни семейни преживявания.',
    'insights.comparison.family.members.title': 'Време със Семейни Членове',
    'insights.comparison.family.members.balanced': 'Имате добре балансирано разпределение на моментите между всички семейни членове. Отлична семейна хармония!',
    'insights.comparison.family.members.catchUp': 'Помислете да отделите повече време с',
    'insights.comparison.family.members.andQuality': 'и техните моменти имат по-ниско качество',
    'insights.comparison.family.members.qualityTime': 'Опитайте се да отделите повече качествено време с',
    'insights.comparison.family.members.mostTime': 'Отделяте най-много от семейните си моменти с',
    'insights.comparison.friends.title': 'Сравнение на Приятели',
    'insights.comparison.friends.subtitle': 'Общо количество моменти',
    'insights.comparison.friends.noData': 'Няма налични данни за сравнение',
    'insights.comparison.friends.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение на приятелите.',
    'insights.comparison.friends.otherSpheres': 'Други Сфери',
    'insights.comparison.friends.insight.moreFriendsTime': 'Отделяте повече време за приятели, отколкото средно за други сфери.',
    'insights.comparison.friends.insight.moreOtherSpheresTime': 'Отделяте по-малко време за приятели в сравнение с други сфери. Помислете да намерите повече време за приятелства.',
    'insights.comparison.friends.insight.balancedTime': 'Имате добре балансирано разпределение на времето между приятели и други сфери.',
    'insights.comparison.friends.members.title': 'Време с Приятели',
    'insights.comparison.friends.members.balanced': 'Имате добре балансирано разпределение на моментите между всички приятели. Отлична хармония в приятелствата!',
    'insights.comparison.friends.members.catchUp': 'Помислете да отделите повече време с',
    'insights.comparison.friends.members.andQuality': 'и техните моменти имат по-ниско качество',
    'insights.comparison.friends.members.qualityTime': 'Опитайте се да отделите повече качествено време с',
    'insights.comparison.friends.members.mostTime': 'Отделяте най-много от моментите си с приятели с',
    'insights.comparison.hobbies.title': 'Сравнение на Хобита',
    'insights.comparison.hobbies.subtitle': 'Общо количество моменти',
    'insights.comparison.hobbies.noData': 'Няма налични данни за сравнение',
    'insights.comparison.hobbies.requiresEntities': 'Добавете спомени и моменти в други сфери, за да видите анализи на сравнение на хобитата.',
    'insights.comparison.hobbies.otherSpheres': 'Други Сфери',
    'insights.comparison.hobbies.insight.moreHobbiesTime': 'Отделяте повече време за хобита, отколкото средно за други сфери.',
    'insights.comparison.hobbies.insight.moreOtherSpheresTime': 'Отделяте по-малко време за хобита в сравнение с други сфери. Помислете да намерите повече време за вашите интереси.',
    'insights.comparison.hobbies.insight.balancedTime': 'Имате добре балансирано разпределение на времето между хобита и други сфери.',
    'insights.comparison.hobbies.members.title': 'Време за Хобита',
    'insights.comparison.hobbies.members.balanced': 'Имате добре балансирано разпределение на моментите между всички хобита. Отличен баланс на хобитата!',
    'insights.comparison.hobbies.members.catchUp': 'Помислете да отделите повече време за',
    'insights.comparison.hobbies.members.mostTime': 'Отделяте най-много от моментите си за хобита за',
    'insights.detail.relationship.title': 'Детайли за Връзката',
    'insights.detail.relationship.noData': 'Връзката не е намерена',
    'insights.detail.relationship.memories.title': 'Спомени',
    'insights.detail.relationship.memories.noData': 'Няма записани спомени за тази връзка',
    'insights.detail.relationship.memories.more.better': 'Тази връзка има значително повече спомени в сравнение с другите ви връзки, и общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.relationship.memories.more.worse': 'Тази връзка има значително повече спомени в сравнение с другите ви връзки, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.relationship.memories.more.same': 'Тази връзка има значително повече спомени в сравнение с другите ви връзки, с подобно общо качество.',
    'insights.detail.relationship.memories.less.better': 'Тази връзка има по-малко спомени в сравнение с другите ви връзки, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.relationship.memories.less.worse': 'Тази връзка има по-малко спомени в сравнение с другите ви връзки, и общото качество (слънчеви моменти) също е по-ниско.',
    'insights.detail.relationship.memories.less.same': 'Тази връзка има по-малко спомени в сравнение с другите ви връзки, с подобно общо качество.',
    'insights.detail.relationship.memories.same.better': 'Тази връзка има приблизително същото количество спомени като другите ви връзки, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.relationship.memories.same.worse': 'Тази връзка има приблизително същото количество спомени като другите ви връзки, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.relationship.memories.same.same': 'Тази връзка има приблизително същото количество спомени и подобно общо качество в сравнение с другите ви връзки.',
    'insights.detail.job.title': 'Детайли за Работата',
    'insights.detail.job.noData': 'Работата не е намерена',
    'insights.detail.job.memories.title': 'Спомени',
    'insights.detail.job.memories.noData': 'Няма записани спомени за тази работа',
    'insights.detail.job.memories.more.better': 'Тази работа има значително повече спомени в сравнение с другите ви работи, и общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.job.memories.more.worse': 'Тази работа има значително повече спомени в сравнение с другите ви работи, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.job.memories.more.same': 'Тази работа има значително повече спомени в сравнение с другите ви работи, с подобно общо качество.',
    'insights.detail.job.memories.less.better': 'Тази работа има по-малко спомени в сравнение с другите ви работи, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.job.memories.less.worse': 'Тази работа има по-малко спомени в сравнение с другите ви работи, и общото качество (слънчеви моменти) също е по-ниско.',
    'insights.detail.job.memories.less.same': 'Тази работа има по-малко спомени в сравнение с другите ви работи, с подобно общо качество.',
    'insights.detail.job.memories.same.better': 'Тази работа има приблизително същото количество спомени като другите ви работи, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.job.memories.same.worse': 'Тази работа има приблизително същото количество спомени като другите ви работи, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.job.memories.same.same': 'Тази работа има приблизително същото количество спомени и подобно общо качество в сравнение с другите ви работи.',
    'insights.detail.family.title': 'Детайли за Семейния Член',
    'insights.detail.family.noData': 'Семейният член не е намерен',
    'insights.detail.family.memories.title': 'Спомени',
    'insights.detail.family.memories.noData': 'Няма записани спомени за този семейен член',
    'insights.detail.family.memories.more.better': 'Този семейен член има значително повече спомени в сравнение с другите ви семейни членове, и общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.family.memories.more.worse': 'Този семейен член има значително повече спомени в сравнение с другите ви семейни членове, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.family.memories.more.same': 'Този семейен член има значително повече спомени в сравнение с другите ви семейни членове, с подобно общо качество.',
    'insights.detail.family.memories.less.better': 'Този семейен член има по-малко спомени в сравнение с другите ви семейни членове, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.family.memories.less.worse': 'Този семейен член има по-малко спомени в сравнение с другите ви семейни членове, и общото качество (слънчеви моменти) също е по-ниско.',
    'insights.detail.family.memories.less.same': 'Този семейен член има по-малко спомени в сравнение с другите ви семейни членове, с подобно общо качество.',
    'insights.detail.family.memories.same.better': 'Този семейен член има приблизително същото количество спомени като другите ви семейни членове, но общото качество (слънчеви моменти) е по-добро.',
    'insights.detail.family.memories.same.worse': 'Този семейен член има приблизително същото количество спомени като другите ви семейни членове, но общото качество (слънчеви моменти) е по-ниско.',
    'insights.detail.family.memories.same.same': 'Този семейен член има приблизително същото количество спомени и подобно общо качество в сравнение с другите ви семейни членове.',
    'insights.suggestion.relationships.worse': 'Текущата ви връзка има по-малко слънчеви моменти в сравнение с миналите връзки. Помислете за създаване на повече положителни преживявания заедно.',
    'insights.suggestion.relationships.low': 'Създайте повече слънчеви моменти с текущия си партньор, за да укрепите връзката. Малките жестове и качественото време могат да направят голяма разлика.',
    'insights.suggestion.relationships.progress': 'Отличен напредък! Създавате повече положителни моменти от миналите си връзки. Продължете да поддържате тази връзка.',
    'insights.suggestion.relationships.strong': 'Връзката ви процъфтява с много слънчеви моменти! Продължете да поддържате тази положителна връзка.',
    'insights.suggestion.career.worse': 'Текущата ви работа има по-малко положителни моменти в сравнение с предишните роли. Помислете какви промени могат да подобрят удовлетворението ви от работата.',
    'insights.suggestion.career.low': 'Фокусирайте се върху създаване на повече положителни преживявания на работа. Идентифицирайте какво ви носи радост и удовлетворение в ролята ви.',
    'insights.suggestion.career.progress': 'Отличен напредък! Преживявате повече положителни моменти от предишните си работи. Продължете да градите върху този успех.',
    'insights.suggestion.career.strong': 'Процъфтявате в кариерата си с много положителни моменти! Продължете да растете и намирате удовлетворение в работата си.',
    'insights.suggestion.family.low': 'Създайте повече положителни моменти със семейните членове, за да укрепите тези важни връзки.',
    'insights.suggestion.family.strong': 'Семейните ви връзки са силни с много положителни моменти! Продължете да поддържате тези връзки.',
    
    'profile.ongoing': 'Текуща',
    'profile.noMemories': 'Няма спомени',
    'profile.oneMemory': '1 спомен',
    'profile.memories': 'спомени',
    'profile.relationshipQuality': 'Качество на връзката',
    'profile.relationshipQuality.positive': 'позитивно',
    'job.ongoing': 'Текуща',
    'job.current': 'Текуща',
    'job.noMemories': 'Няма спомени',
    'job.oneMemory': '1 спомен',
    'job.memories': 'спомени',
    'job.satisfaction': 'Удовлетворение от работата',
    'job.satisfaction.positive': 'позитивно',
    'job.addNewJob': 'Добави Ново Работно Място',
    'job.editJob.title': 'Редактирай Работно Място',
    'job.addJob.description': 'Проследявайте кариерното си пътешествие, като добавите работна позиция.',
    'job.editJob.description': 'Актуализирайте информацията за работата си и проследявайте кариерното си пътешествие.',
    'job.editJob.manage': 'Управлявайте информацията за работата си и спомените.',
    'job.jobTitleAndCompany': 'Длъжност / Име на Фирма',
    'job.jobTitleAndCompany.placeholder': 'напр. Софтуерен инженер в Google',
    'job.description.placeholder': 'Кратко описание на ролята...',
    'job.startDate': 'Начална Дата',
    'job.startDate.select': 'Изберете начална дата',
    'job.startDate.selectTitle': 'Изберете Начална Дата',
    'job.currentJob': 'Текуща работа',
    'job.endDate': 'Крайна Дата',
    'job.endDate.select': 'Изберете крайна дата',
    'job.endDate.selectTitle': 'Изберете Крайна Дата',
    'job.companyLogo': 'Лого на Фирма / Изображение (Незадължително)',
    'profile.addFamilyMember.description': 'Добавете нов член на семейството, за да проследявате спомените си',
    'profile.editFamilyMember.description': 'Актуализирайте информацията за член на семейството',
    'profile.familyMember.name.required': 'Името е задължително',
    
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
    'memory.lesson': 'Урок',
    'memory.lesson.plural': 'Уроци',
    'memory.lesson.none': 'Все още няма уроци',
    'memory.lesson.placeholder': 'Въведете научен урок...',
    'memory.sunnyMoment': 'Слънчев Момент',
    'memory.fillAllClouds': 'Моля, попълнете всички облаци с текст, преди да продължите.',
    'memory.fillAllSuns': 'Моля, попълнете всички слънца с текст, преди да продължите.',
    'memory.save': 'Запази Спомен',
    'memory.delete': 'Изтрий',
    'memory.delete.confirm': 'Изтрий Спомен',
    'memory.delete.confirm.message': 'Сигурни ли сте, че искате да изтриете този спомен? Това действие не може да бъде отменено.',
    'memory.delete.confirm.message.withTitle': 'Сигурни ли сте, че искате да изтриете "{title}"? Това действие не може да бъде отменено.',
    'memory.emptyState.title': 'Все още няма спомени',
    'memory.emptyState.description': 'Това е първата стъпка към яснота. Изброяването на вашите спомени ви помага да оцените реалността, превръщайки размишленията в действие.',
    'memory.error.titleRequired': 'Моля, въведете заглавие на спомена.',
    'memory.error.saveFailed': 'Неуспешно запазване на спомена. Моля, опитайте отново.',
    'memory.error.deleteFailed': 'Неуспешно изтриване на спомена. Моля, опитайте отново.',
    'memory.error.atLeastOneMomentRequired': 'Моля, добавете поне един момент (облак или слънце) към спомена.',
    'memory.error.fillAllCloudsBeforeAdding': 'Моля, попълнете всички съществуващи облаци с текст, преди да добавите нов.',
    'memory.error.fillAllSunsBeforeAdding': 'Моля, попълнете всички съществуващи слънца с текст, преди да добавите ново.',
    'memory.error.fillAllLessonsBeforeAdding': 'Моля, попълнете всички съществуващи уроци с текст, преди да добавите нов.',
    'memory.actionSheet.edit': 'Редактирай',
    'memory.actionSheet.delete': 'Изтрий',
    'memory.remindWhy': 'Напомни защо',
    
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
    'error.missingParameters': 'Липсват задължителни параметри. Моля, върнете се назад и опитайте отново.',
    'error.cameraPermissionRequired': 'Съжаляваме, нуждаем се от разрешение за достъп до галерията, за да качваме снимки!',
    'error.imagePickFailed': 'Неуспешно избиране на изображение. Моля, опитайте отново.',
    
    // Subscription
    'subscription.title': 'Отключи Премиум',
    'subscription.subtitle': 'Получи неограничен достъп до всички функции',
    'subscription.feature.unlimited': 'Неограничени партньори, работни места, приятели, членове на семейството и хобита',
    'subscription.feature.insights': 'Достъп до премиум анализи и статистики',
    'subscription.feature.support': 'Приоритетна поддръжка',
    'subscription.monthly.title': 'Месечно',
    'subscription.monthly.period': 'на месец',
    'subscription.yearly.title': 'Годишно',
    'subscription.yearly.period': 'на година',
    'subscription.yearly.savings': 'Спестете {percent}%',
    'subscription.purchase': 'Абонирай се',
    'subscription.restore': 'Възстанови Покупки',
    'subscription.view': 'Виж Планове',
    'subscription.success.title': 'Успех!',
    'subscription.success.message': 'Вашият абонамент е вече активен!',
    'subscription.error.title': 'Неуспешна покупка',
    'subscription.error.message': 'Нещо се обърка. Моля, опитайте отново.',
    'subscription.restore.success.title': 'Възстановено',
    'subscription.restore.success.message': 'Вашите покупки са възстановени.',
    'subscription.restore.error.title': 'Неуспешно възстановяване',
    'subscription.restore.error.message': 'Не са намерени покупки за възстановяване.',
    'subscription.limit.title': 'Изисква се абонамент',
    'subscription.limit.partner': 'Можете да създадете един партньор безплатно. Абонирайте се, за да създавате повече партньори.',
    'subscription.limit.job': 'Можете да създадете едно работно място безплатно. Абонирайте се, за да създавате повече работни места.',
    'subscription.limit.friend': 'Можете да създадете един приятел безплатно. Абонирайте се, за да създавате повече приятели.',
    'subscription.limit.family': 'Можете да създадете един член на семейството безплатно. Абонирайте се, за да създавате повече членове на семейството.',
    'subscription.limit.hobby': 'Можете да създадете едно хоби безплатно. Абонирайте се, за да създавате повече хобита.',
    
    // Notifications
    'notifications.title': 'Известия',
    'notifications.sphere.friends': 'Приятели',
    'notifications.sphere.family': 'Семейство',
    'notifications.sphere.relationships': 'Връзки',
    'notifications.status.on': 'Вкл',
    'notifications.status.off': 'Изкл',
    'notifications.settings.title': 'Настройки за известия',
    'notifications.settings.turnOn': 'Включи',
    'notifications.settings.turnOnDescription': 'Включете, за да активирате известията.',
    'notifications.settings.message': 'Съобщение',
    'notifications.settings.messagePlaceholder': 'Свържете се с {name} днес',
    'notifications.settings.frequency': 'Честота',
    'notifications.settings.frequency.daily': 'Ежедневно',
    'notifications.settings.frequency.weekly': 'Седмично',
    'notifications.settings.dayOfWeek': 'Ден от седмицата',
    'notifications.settings.dayOfWeek.sun': 'Нед',
    'notifications.settings.dayOfWeek.mon': 'Пон',
    'notifications.settings.dayOfWeek.tue': 'Вто',
    'notifications.settings.dayOfWeek.wed': 'Сря',
    'notifications.settings.dayOfWeek.thu': 'Чет',
    'notifications.settings.dayOfWeek.fri': 'Пет',
    'notifications.settings.dayOfWeek.sat': 'Съб',
    'notifications.settings.time': 'Час',
    'notifications.settings.done': 'Готово',
    'notifications.settings.sound': 'Звук',
    'notifications.settings.sound.on': 'Вкл',
    'notifications.settings.sound.off': 'Изкл',
    'notifications.settings.condition': 'Условие',
    'notifications.settings.condition.met': 'Изпълнено',
    'notifications.settings.condition.notMet': 'Не е изпълнено',
    'notifications.settings.condition.belowAvg': 'Под средното',
    'notifications.settings.condition.noRecent': 'Без скорошни',
    'notifications.settings.condition.lessThanJob': 'По-малко от работата',
    'notifications.settings.condition.lessThanFriendsAvg': 'По-малко от средното на приятелите',
    'notifications.settings.condition.noRecentDaysPlaceholder': 'Дни без скорошни (напр., 7)',
    'notifications.settings.condition.belowAvg.title': 'Под средното',
    'notifications.settings.condition.belowAvg.body': 'Известява, когато този обект има по-малко моменти от средното за всички обекти в тази сфера. Помага да се идентифицират връзки, които може да се нуждаят от повече внимание.',
    'notifications.settings.condition.noRecent.title': 'Няма скорошни моменти',
    'notifications.settings.condition.noRecent.body': 'Известява, когато не сте добавили моменти за този обект през определен брой дни. Помага да поддържате редовна рефлексия и връзка.',
    'notifications.settings.condition.lessThanJob.title': 'По-малко от работата',
    'notifications.settings.condition.lessThanJob.body': 'Известява, когато тази връзка има по-малко моменти (спомени, анализи) от текущата ви работа. Това помага да се гарантира, че отделяте достатъчно внимание на връзките си.',
    'notifications.settings.condition.lessThanFriendsAvg.title': 'По-малко от средното на приятелите',
    'notifications.settings.condition.lessThanFriendsAvg.body': 'Известява, когато тази връзка има по-малко моменти от средното на вашите приятелства. Това помага да се поддържа баланс между романтични връзки и приятелства.',
    'notifications.settings.sphere': 'Сфера',

    // Onboarding
    'onboarding.skip': 'Пропусни',
    'onboarding.next': 'Напред',
    'onboarding.back': 'Назад',
    'onboarding.finish': 'Започни',
    'onboarding.done': 'Готово',
    'onboarding.demo': 'Пробно Демо',
    'onboarding.of': 'от',
    'onboarding.intro.title': 'Добре дошли в Sferas!',
    'onboarding.intro.message': 'Sferas ви помага да оцените и проследите общото количество слънчеви и облачни моменти във вашия живот, измерени като % в главния аватар. Вижте с един поглед колко балансирана е всяка сфера от живота ви.',
    'onboarding.welcome.title': 'Размислете върху пътуването си',
    'onboarding.welcome.message': 'Преразгледайте моментите и уроците от живота си, за да помните миналото си и да оформите бъдещето си. Поемете контрол над пътуването си, като размишлявате върху това, което е най-важно във всички области на живота ви.',
    'onboarding.moments.title': 'Проследете моментите си',
    'onboarding.moments.message': 'Уловете слънчевите и облачните моменти от живота си. Записвайте спомени, размишлявайте върху преживявания и ги преразглеждайте, за да получите перспектива и разбиране.',
    'onboarding.lessons.title': 'Научете и растете',
    'onboarding.lessons.message': 'Извлечете ценни уроци от вашите преживявания. Документирайте какво сте научили от положителните и предизвикателните моменти, за да насърчите личностния растеж и да избегнете повтарящи се модели.',
    'onboarding.insights.title': 'Визуализирайте пътуването си',
    'onboarding.insights.message': 'Разгледайте живота си чрез диаграмата Колело на живота. Получете информация за това как времето и енергията ви се разпределят в различните сфери и идентифицирайте области, които се нуждаят от внимание.',
    'onboarding.notifications.title': 'Оставайте свързани',
    'onboarding.notifications.message': 'Задайте напомняния, за да поддържате връзка с важни хора или да наваксате с различни житейски сфери. Никога не губете от поглед това, което е най-важно за вас.',
    'onboarding.getStarted.title': 'Готови ли сте да започнете?',
    'onboarding.getStarted.message': 'Започнете, като създадете записи във всяка сфера. Добавете партньори, работа, членове на семейството, приятели или хобита, за да започнете да проследявате житейските си моменти и да откривате смислени прозрения.',

    // Settings - Help Section
    'settings.help.title': 'Помощ',
    'settings.help.viewGuide': 'Преглед на ръководството',

    // Moment Suggestions
    'suggestions.birthday.hardTruths.0': 'Не си спомниха рожденния ми ден',
    'suggestions.birthday.hardTruths.1': 'Останах сам в специалния си ден',
    'suggestions.birthday.hardTruths.2': 'Празненството се усеща наложено и неудобно',
    'suggestions.birthday.goodFacts.0': 'Научих кой наистина се грижи за мен',
    'suggestions.birthday.goodFacts.1': 'Мога да създам собствена радост без одобрение',
    'suggestions.birthday.goodFacts.2': 'Някои приятели се появиха, когато беше важно',
    'suggestions.birthday.lessons.0': 'Рождените дни не определят стойността ми',
    'suggestions.birthday.lessons.1': 'Истинските приятели се появяват без напомняния',
    'suggestions.birthday.lessons.2': 'Мога да празнувам себе си на първо място',
    'suggestions.anniversary.hardTruths.0': 'Забравиха годишнината ни',
    'suggestions.anniversary.hardTruths.1': 'Денят значеше повече за мен, отколкото за тях',
    'suggestions.anniversary.hardTruths.2': 'Усетих се сам, дори когато бяхме заедно',
    'suggestions.anniversary.goodFacts.0': 'Помня хубавите времена, които имахме',
    'suggestions.anniversary.goodFacts.1': 'Почетох историята ни, дори ако те не го направиха',
    'suggestions.anniversary.goodFacts.2': 'Научих какво наистина ценя във взаимоотношенията',
    'suggestions.anniversary.lessons.0': 'Равната инвестиция има значение във взаимоотношенията',
    'suggestions.anniversary.lessons.1': 'Заслужавам някой, който помни важното',
    'suggestions.anniversary.lessons.2': 'Паметта и усилията показват истинска грижа',
    'suggestions.breakup.hardTruths.0': 'Връзката приключи много преди да я прекратим',
    'suggestions.breakup.hardTruths.1': 'Игнорирах червените знамена твърде дълго',
    'suggestions.breakup.hardTruths.2': 'Искахме различни неща, но никой не го призна',
    'suggestions.breakup.goodFacts.0': 'Накрая намерих смелостта да пусна',
    'suggestions.breakup.goodFacts.1': 'Свободен съм да намеря някой, който наистина ме цени',
    'suggestions.breakup.goodFacts.2': 'Научих какво не искам в партньор',
    'suggestions.breakup.lessons.0': 'Оставането заради комфорт не е същото като любов',
    'suggestions.breakup.lessons.1': 'Заслужавам някой, който се бори за нас',
    'suggestions.breakup.lessons.2': 'Краищата могат да бъдат нови начала',
    'suggestions.wedding.hardTruths.0': 'Усетих се невидим на тяхната сватба',
    'suggestions.wedding.hardTruths.1': 'Гледането как продължават напред беше по-трудно от очакваното',
    'suggestions.wedding.hardTruths.2': 'Осъзнах какво можехме да имаме',
    'suggestions.wedding.goodFacts.0': 'Показах сила, като присъствах',
    'suggestions.wedding.goodFacts.1': 'Мога да бъда щастлив за тях въпреки болката си',
    'suggestions.wedding.goodFacts.2': 'Справих се с грация и достойнство',
    'suggestions.wedding.lessons.0': 'Тяхното щастие не намалява моето',
    'suggestions.wedding.lessons.1': 'Приключването идва отвътре, не от събития',
    'suggestions.wedding.lessons.2': 'Способен съм да продължа напред',
    'suggestions.holiday.hardTruths.0': 'Празниците се усещаха празни без тях',
    'suggestions.holiday.hardTruths.1': 'Семейните събирания подчертаха какво загубих',
    'suggestions.holiday.hardTruths.2': 'Усетих се като чужденец на познати места',
    'suggestions.holiday.goodFacts.0': 'Създадох нови традиции за себе си',
    'suggestions.holiday.goodFacts.1': 'Намерих радост на неочаквани места',
    'suggestions.holiday.goodFacts.2': 'Някои членове на семейството наистина се появиха за мен',
    'suggestions.holiday.lessons.0': 'Празниците могат да бъдат предефинирани и възвърнати',
    'suggestions.holiday.lessons.1': 'Традициите се развиват и това е нормално',
    'suggestions.holiday.lessons.2': 'Мога да създам радост независимо',
    'suggestions.christmas.hardTruths.0': 'Коледа ми напомни какво загубих',
    'suggestions.christmas.hardTruths.1': 'Празното място на масата боля повече от очакваното',
    'suggestions.christmas.hardTruths.2': 'Всички други изглеждаха щастливи, докато аз се борех',
    'suggestions.christmas.goodFacts.0': 'Преживях най-трудния празничен сезон',
    'suggestions.christmas.goodFacts.1': 'Намерих моменти на мир и благодарност',
    'suggestions.christmas.goodFacts.2': 'Научих, че съм по-силен, отколкото мислех',
    'suggestions.christmas.lessons.0': 'Скръбта и радостта могат да съществуват заедно',
    'suggestions.christmas.lessons.1': 'Добре е да се чувствам различно от другите',
    'suggestions.christmas.lessons.2': 'Следващата година ще бъде по-лесна',
    'suggestions.vacation.hardTruths.0': 'Пътуването, което планирахме заедно, никога не се случи',
    'suggestions.vacation.hardTruths.1': 'Видях ги на ваканция с някой нов',
    'suggestions.vacation.hardTruths.2': 'Нашите мечти за пътуване умряха с връзката',
    'suggestions.vacation.goodFacts.0': 'Направих това пътуване сам и го обичах',
    'suggestions.vacation.goodFacts.1': 'Открих нови места по собствените си условия',
    'suggestions.vacation.goodFacts.2': 'Доказах, че не ми трябва партньор за да изследвам',
    'suggestions.vacation.lessons.0': 'Независимостта може да бъде освобождаваща',
    'suggestions.vacation.lessons.1': 'Самостоятелните приключения са също толкова значими',
    'suggestions.vacation.lessons.2': 'Мога да създам спомени без тях',
    'suggestions.trip.hardTruths.0': 'Нашите планирани пътувания заедно никога не се реализираха',
    'suggestions.trip.hardTruths.1': 'Пътуваха без мен до места, за които мечтаехме',
    'suggestions.trip.hardTruths.2': 'Пътуването заедно разкри нашата несъвместимост',
    'suggestions.trip.goodFacts.0': 'Планирам пътувания, които ме вълнуват',
    'suggestions.trip.goodFacts.1': 'Сега мога да пътувам където искам',
    'suggestions.trip.goodFacts.2': 'Самостоятелните пътувания ме научиха на независимост',
    'suggestions.trip.lessons.0': 'Приключението не изисква партньор',
    'suggestions.trip.lessons.1': 'Мога да изследвам света на собствените си условия',
    'suggestions.trip.lessons.2': 'Плановете за пътуване трябва да съответстват на желанията ми, а не на компромиси',
    'suggestions.walk.hardTruths.0': 'Нашите разходки заедно станаха мълчаливи и неудобни',
    'suggestions.walk.hardTruths.1': 'Никога не искаха да ходят с мен',
    'suggestions.walk.hardTruths.2': 'Ходенето сам ми напомняше какво загубих',
    'suggestions.walk.goodFacts.0': 'Ходенето сам е мирно и медитативно',
    'suggestions.walk.goodFacts.1': 'Мога да ходя където искам, в моето собствено темпо',
    'suggestions.walk.goodFacts.2': 'Разходките ми помагат да обработвам и да се изцелявам',
    'suggestions.walk.lessons.0': 'Усамотението в природата е изцеляващо',
    'suggestions.walk.lessons.1': 'Придвижването напред буквално ми помага да се придвижа емоционално',
    'suggestions.walk.lessons.2': 'Мога да намеря мир в простите моменти сам',
    'suggestions.mountain.hardTruths.0': 'Планините, които планирахме да изкачим заедно, остават неизкачени',
    'suggestions.mountain.hardTruths.1': 'Достигнаха върхове без мен',
    'suggestions.mountain.hardTruths.2': 'Планинските приключения, за които мечтаехме, никога не се случиха',
    'suggestions.mountain.goodFacts.0': 'Сега покорявам собствените си планини',
    'suggestions.mountain.goodFacts.1': 'Планинските гледки ми напомнят за по-голямата картина на живота',
    'suggestions.mountain.goodFacts.2': 'Катеренето ме учи, че мога да надвия всичко',
    'suggestions.mountain.lessons.0': 'Мога да достигна върхове сам',
    'suggestions.mountain.lessons.1': 'Пътят нагоре е също толкова важен, колкото и гледката',
    'suggestions.mountain.lessons.2': 'Всеки връх доказва моята сила',
    'suggestions.lake.hardTruths.0': 'Спомените край езерото, които споделяхме, сега са горчиво-сладки',
    'suggestions.lake.hardTruths.1': 'Наслаждаваха се на водата без мен',
    'suggestions.lake.hardTruths.2': 'Нашите мирни моменти край езерото са изчезнали',
    'suggestions.lake.goodFacts.0': 'Езерата все още ми носят мир и спокойствие',
    'suggestions.lake.goodFacts.1': 'Водата има успокояващ, изцеляващ ефект',
    'suggestions.lake.goodFacts.2': 'Мога да намеря спокойствие край водата сам',
    'suggestions.lake.lessons.0': 'Мирът на природата принадлежи на всички',
    'suggestions.lake.lessons.1': 'Спокойните води отразяват моята вътрешна спокойност',
    'suggestions.lake.lessons.2': 'Мога да възвърна мирните места за себе си',
    'suggestions.sand.hardTruths.0': 'Ходенето по пясъка заедно се усещаше като ходене върху счупени обещания',
    'suggestions.sand.hardTruths.1': 'Плажът ми напомня за планове, които се измиха',
    'suggestions.sand.hardTruths.2': 'Нашите следи в пясъка бяха временни, като нашата връзка',
    'suggestions.sand.goodFacts.0': 'Пясъкът между пръстите ми все още се усеща заземяващ',
    'suggestions.sand.goodFacts.1': 'Плажовете са места за обновление и пускане',
    'suggestions.sand.goodFacts.2': 'Всяка вълна измива малко повече болка',
    'suggestions.sand.lessons.0': 'Като пясъка, мога да се преоформя',
    'suggestions.sand.lessons.1': 'Приливът винаги идва свеж и нов',
    'suggestions.sand.lessons.2': 'Плажните спомени могат да бъдат върнати за нови начала',
    'suggestions.work.hardTruths.0': 'Стресът от кариерата ми допринесе за нашите проблеми',
    'suggestions.work.hardTruths.1': 'Приоритизирах работата пред връзката',
    'suggestions.work.hardTruths.2': 'Те никога не разбраха професионалните ми амбиции',
    'suggestions.work.goodFacts.0': 'Постигнах професионален растеж по време на трудни времена',
    'suggestions.work.goodFacts.1': 'Работата осигури стабилност, когато животът беше хаотичен',
    'suggestions.work.goodFacts.2': 'Доказах, че мога да успея независимо',
    'suggestions.work.lessons.0': 'Балансът между работа и живот е от решаващо значение',
    'suggestions.work.lessons.1': 'Партньорът трябва да подкрепя амбициите ми',
    'suggestions.work.lessons.2': 'Успехът не означава нищо без удовлетвореност',
    'suggestions.family.hardTruths.0': 'Семейството ми никога наистина не ги прие',
    'suggestions.family.hardTruths.1': 'Семейните събития станаха неудобни и болезнени',
    'suggestions.family.hardTruths.2': 'Загубих някои семейни връзки при раздялата',
    'suggestions.family.goodFacts.0': 'Семейството ми ме подкрепи през всичко това',
    'suggestions.family.goodFacts.1': 'Засилих връзките със сестри и братя',
    'suggestions.family.goodFacts.2': 'Семейството ми помогна да видя стойността си',
    'suggestions.family.lessons.0': 'Семейната мъдрост често вижда това, което ние не можем',
    'suggestions.family.lessons.1': 'Кръвта е по-гъста от счупените обещания',
    'suggestions.family.lessons.2': 'Истинското семейство се появява в криза',
    'suggestions.move.hardTruths.0': 'Избраха място пред нашата връзка',
    'suggestions.move.hardTruths.1': 'Разстоянието разкри истинската ни ангажираност',
    'suggestions.move.hardTruths.2': 'Жертвах местоположението си за нищо',
    'suggestions.move.goodFacts.0': 'Намерих нов дом и нови начала',
    'suggestions.move.goodFacts.1': 'Преместването ми даде пространство за изцеление',
    'suggestions.move.goodFacts.2': 'Изградих живот, който е наистина мой',
    'suggestions.move.lessons.0': 'Домът е там, където го създам, не там където са те',
    'suggestions.move.lessons.1': 'Географията не може да оправи проблеми във връзката',
    'suggestions.move.lessons.2': 'Способен съм да започна отново навсякъде',
    'suggestions.fight.hardTruths.0': 'Карахме се за едни и същи неща многократно',
    'suggestions.fight.hardTruths.1': 'Споровете станаха по-важни от решенията',
    'suggestions.fight.hardTruths.2': 'Казах неща, които не мога да оттегля',
    'suggestions.fight.goodFacts.0': 'Научих се да комуникирам нуждите си ясно',
    'suggestions.fight.goodFacts.1': 'Открих границите си чрез конфликт',
    'suggestions.fight.goodFacts.2': 'Някои спорове разкриха несъвместимости рано',
    'suggestions.fight.lessons.0': 'Как се караме е по-важно от това за какво се караме',
    'suggestions.fight.lessons.1': 'Уважението трябва да остане дори в несъгласие',
    'suggestions.fight.lessons.2': 'Някои модели не могат да бъдат променени',
    'suggestions.trust.hardTruths.0': 'Доверието беше нарушено и никога не беше напълно възстановено',
    'suggestions.trust.hardTruths.1': 'Останах въпреки че знаех истината',
    'suggestions.trust.hardTruths.2': 'Интуицията ми беше права през цялото време',
    'suggestions.trust.goodFacts.0': 'Уча се да се доверявам на себе си отново',
    'suggestions.trust.goodFacts.1': 'Не компрометирах ценностите си в края',
    'suggestions.trust.goodFacts.2': 'Избрах самоуважение вместо комфорт',
    'suggestions.trust.lessons.0': 'Доверието е основата на всичко',
    'suggestions.trust.lessons.1': 'След като се счупи, рядко е същото',
    'suggestions.trust.lessons.2': 'Трябва да се доверявам на себе си първо',
    'suggestions.cheat.hardTruths.0': 'Избраха някой друг, докато бяха с мен',
    'suggestions.cheat.hardTruths.1': 'Никога не бях достатъчен за тях',
    'suggestions.cheat.hardTruths.2': 'Предателството реже по-дълбоко, отколкото признах',
    'suggestions.cheat.goodFacts.0': 'Открих силата си чрез предателството',
    'suggestions.cheat.goodFacts.1': 'Научих, че заслужавам пълна лоялност',
    'suggestions.cheat.goodFacts.2': 'Намерих самочувствие отвъд тяхното одобрение',
    'suggestions.cheat.lessons.0': 'Изневярата е за техния характер, не за моята стойност',
    'suggestions.cheat.lessons.1': 'Заслужавам непоколебима вярност',
    'suggestions.cheat.lessons.2': 'Предателството учи кои са хората наистина',
    'suggestions.lie.hardTruths.0': 'Лъгаха за важни неща',
    'suggestions.lie.hardTruths.1': 'Приемах полуистини твърде дълго',
    'suggestions.lie.hardTruths.2': 'Основата беше изградена на измама',
    'suggestions.lie.goodFacts.0': 'В крайна сметка видях през лъжите',
    'suggestions.lie.goodFacts.1': 'Научих се да разпознавам нечестността',
    'suggestions.lie.goodFacts.2': 'Ценя автентичността повече от всякога',
    'suggestions.lie.lessons.0': 'Честността е ненадминаема',
    'suggestions.lie.lessons.1': 'Малките лъжи разкриват по-големи недостатъци в характера',
    'suggestions.lie.lessons.2': 'Истината е единствената основа за любов',
    'suggestions.friend.hardTruths.0': 'Някои приятели застанаха от тяхната страна',
    'suggestions.friend.hardTruths.1': 'Загубих взаимни приятели при раздялата',
    'suggestions.friend.hardTruths.2': 'Приятелите виждаха проблеми, които не можех да видя',
    'suggestions.friend.goodFacts.0': 'Истинските приятели останаха до мен',
    'suggestions.friend.goodFacts.1': 'Създадох нови, по-дълбоки приятелства',
    'suggestions.friend.goodFacts.2': 'Приятелите ми помогнаха да се преоткрия',
    'suggestions.friend.lessons.0': 'Истинските приятели се разкриват в трудностите',
    'suggestions.friend.lessons.1': 'Качеството има значение повече от количеството',
    'suggestions.friend.lessons.2': 'Приятелството е избор, не задължение',
    'suggestions.pet.hardTruths.0': 'Трябваше да решим кой ще запази домашния любимец',
    'suggestions.pet.hardTruths.1': 'Домашният любимец също ги липсва',
    'suggestions.pet.hardTruths.2': 'Споделената грижа за домашен любимец е разбиваща сърцето',
    'suggestions.pet.goodFacts.0': 'Нашият домашен любимец дава безусловна любов',
    'suggestions.pet.goodFacts.1': 'Имам верен спътник през това',
    'suggestions.pet.goodFacts.2': 'Домашният любимец ни донесе радост дори в трудни времена',
    'suggestions.pet.lessons.0': 'Домашните любимци ни обичат през всичко',
    'suggestions.pet.lessons.1': 'Простата компания може да изцели',
    'suggestions.pet.lessons.2': 'Безусловната любов все още съществува',
    'suggestions.home.hardTruths.0': 'Домът, който изградихме заедно, сега е просто място',
    'suggestions.home.hardTruths.1': 'Всеки ъгъл крие болезнени спомени',
    'suggestions.home.hardTruths.2': 'Трябваше да напусна дома, който обичах',
    'suggestions.home.goodFacts.0': 'Създавам ново пространство, което е наистина мое',
    'suggestions.home.goodFacts.1': 'Къщата никога не беше това, което го правеше дом',
    'suggestions.home.goodFacts.2': 'Мога да започна отначало без тези спомени',
    'suggestions.home.lessons.0': 'Домът е чувство, не място',
    'suggestions.home.lessons.1': 'Мога да създам убежище навсякъде',
    'suggestions.home.lessons.2': 'Пространствата могат да бъдат върнати и предефинирани',
    'suggestions.money.hardTruths.0': 'Финансовият стрес разкри нашата несъвместимост',
    'suggestions.money.hardTruths.1': 'Ценяха парите повече от връзката ни',
    'suggestions.money.hardTruths.2': 'Бях използван финансово',
    'suggestions.money.goodFacts.0': 'Сега съм финансово независим',
    'suggestions.money.goodFacts.1': 'Научих се да управлявам парите сам',
    'suggestions.money.goodFacts.2': 'Финансовата свобода е овластяваща',
    'suggestions.money.lessons.0': 'Финансовите ценности трябва да се съвпадат във взаимоотношенията',
    'suggestions.money.lessons.1': 'Независимостта е безценна',
    'suggestions.money.lessons.2': 'Парите разкриват характер',
    'suggestions.apology.hardTruths.0': 'Извинението дойде твърде късно',
    'suggestions.apology.hardTruths.1': 'Думите без действия са безсмислени',
    'suggestions.apology.hardTruths.2': 'Заслужавах извинение, което никога не дойде',
    'suggestions.apology.goodFacts.0': 'Научих се да се извинявам на себе си',
    'suggestions.apology.goodFacts.1': 'Не ми трябва тяхното извинение, за да се изцеля',
    'suggestions.apology.goodFacts.2': 'Мога да простя, без да приемам извинения',
    'suggestions.apology.lessons.0': 'Приключването не изисква тяхното участие',
    'suggestions.apology.lessons.1': 'Действията говорят по-силно от извиненията',
    'suggestions.apology.lessons.2': 'Мога да продължа напред без тяхното съжаление',
    'suggestions.promise.hardTruths.0': 'Обещанията бяха нарушени без втора мисъл',
    'suggestions.promise.hardTruths.1': 'Думите бяха евтини, ангажираността беше по-евтина',
    'suggestions.promise.hardTruths.2': 'Вярвах на обещания, на които не трябваше да вярвам',
    'suggestions.promise.goodFacts.0': 'Научих стойността на собствената си дума',
    'suggestions.promise.goodFacts.1': 'Спазвам обещанията към себе си сега',
    'suggestions.promise.goodFacts.2': 'Разпознавам празните обещания бързо сега',
    'suggestions.promise.lessons.0': 'Наблюдавайте действията, не думите',
    'suggestions.promise.lessons.1': 'Спазвайте обещанията към себе си на първо място',
    'suggestions.promise.lessons.2': 'Ангажираността се показва в поведението, не в речта',
    'suggestions.graduation.hardTruths.0': 'Не бяха там за моето голямо постижение',
    'suggestions.graduation.hardTruths.1': 'Празнувах сам това, което трябваше да бъде споделено',
    'suggestions.graduation.hardTruths.2': 'Тяхното отсъствие омърси момент, за който работех усилено',
    'suggestions.graduation.goodFacts.0': 'Постигнах тази граница сам',
    'suggestions.graduation.goodFacts.1': 'Моето постижение не зависи от тяхното присъствие',
    'suggestions.graduation.goodFacts.2': 'Доказах, че мога да успея независимо',
    'suggestions.graduation.lessons.0': 'Празнувам успехите си с тях или без тях',
    'suggestions.graduation.lessons.1': 'Постиженията са само мои',
    'suggestions.graduation.lessons.2': 'Успехът е по-сладък, когато е наистина мой',
    'suggestions.promotion.hardTruths.0': 'Не празнуваха моя професионален успех',
    'suggestions.promotion.hardTruths.1': 'Моите постижения не означаваха нищо за тях',
    'suggestions.promotion.hardTruths.2': 'Работех усилено, но се чувствах неподкрепен',
    'suggestions.promotion.goodFacts.0': 'Заработих това чрез собствените си усилия',
    'suggestions.promotion.goodFacts.1': 'Моят професионален растеж показва моята устойчивост',
    'suggestions.promotion.goodFacts.2': 'Изграждам живот, който е наистина мой',
    'suggestions.promotion.lessons.0': 'Не ми трябва тяхното одобрение, за да успея',
    'suggestions.promotion.lessons.1': 'Професионалният растеж се случва с тях или без тях',
    'suggestions.promotion.lessons.2': 'Моята стойност не се измерва от тяхното признание',
    'suggestions.illness.hardTruths.0': 'Не бяха там, когато бях болен',
    'suggestions.illness.hardTruths.1': 'Усетих се сам по време на най-уязвимите ми моменти',
    'suggestions.illness.hardTruths.2': 'Моите здравословни проблеми не имаха значение за тях',
    'suggestions.illness.goodFacts.0': 'Научих се да се грижа за себе си',
    'suggestions.illness.goodFacts.1': 'Открих сила, която не знаех, че имам',
    'suggestions.illness.goodFacts.2': 'Преживях без тяхната подкрепа',
    'suggestions.illness.lessons.0': 'Трябва да приоритизирам собственото си здраве',
    'suggestions.illness.lessons.1': 'Самообгрижването не е егоистично, то е необходимо',
    'suggestions.illness.lessons.2': 'Мога да разчитам на себе си в болест',
    'suggestions.hospital.hardTruths.0': 'Никога не ме посетиха в болницата',
    'suggestions.hospital.hardTruths.1': 'Изправих се срещу страха си сам, когато се нуждаех от подкрепа',
    'suggestions.hospital.hardTruths.2': 'Медицинските спешни случаи разкриха техните истински приоритети',
    'suggestions.hospital.goodFacts.0': 'Справих се с медицинските предизвикателства със смелост',
    'suggestions.hospital.goodFacts.1': 'Научих, че съм по-силен, отколкото мислех',
    'suggestions.hospital.goodFacts.2': 'Имам хора, които наистина се грижат за моето здраве',
    'suggestions.hospital.lessons.0': 'Истинската грижа се появява в криза',
    'suggestions.hospital.lessons.1': 'Здравословните спешни случаи разкриват характера',
    'suggestions.hospital.lessons.2': 'Заслужавам подкрепа в най-трудните ми моменти',
    'suggestions.concert.hardTruths.0': 'Планирахме да отидем заедно, но те отидоха с някой друг',
    'suggestions.concert.hardTruths.1': 'Присъствах сам, помнейки нашите планове',
    'suggestions.concert.hardTruths.2': 'Музиката ми напомни какво споделяхме',
    'suggestions.concert.goodFacts.0': 'Насладих се на музиката на собствените си условия',
    'suggestions.concert.goodFacts.1': 'Открих, че мога да се забавлявам сам',
    'suggestions.concert.goodFacts.2': 'Музиката все още ми носи радост без тях',
    'suggestions.concert.lessons.0': 'Не ми трябва спътник, за да се наслаждавам на живота',
    'suggestions.concert.lessons.1': 'Споделените интереси не изискват споделени преживявания',
    'suggestions.concert.lessons.2': 'Мога да създам нови спомени сам',
    'suggestions.restaurant.hardTruths.0': 'Нашият любим ресторант крие твърде много спомени',
    'suggestions.restaurant.hardTruths.1': 'Ядох сам на места, които открихме заедно',
    'suggestions.restaurant.hardTruths.2': 'Всяко ядене ми напомняше за нашите разговори',
    'suggestions.restaurant.goodFacts.0': 'Сега мога да се наслаждавам на хранене сам',
    'suggestions.restaurant.goodFacts.1': 'Откривам нови любими места',
    'suggestions.restaurant.goodFacts.2': 'Храната все още ми носи комфорт и радост',
    'suggestions.restaurant.lessons.0': 'Местата могат да бъдат върнати и предефинирани',
    'suggestions.restaurant.lessons.1': 'Мога да намеря радост в простите удоволствия сам',
    'suggestions.restaurant.lessons.2': 'Новите спомени могат да презапишат старите',
    'suggestions.date.hardTruths.0': 'Отменяха плановете ни в последния момент многократно',
    'suggestions.date.hardTruths.1': 'Нашите срещи станаха задължения, а не радости',
    'suggestions.date.hardTruths.2': 'Влагах повече усилия в срещите, отколкото те',
    'suggestions.date.goodFacts.0': 'Научих какво прави една добра среща',
    'suggestions.date.goodFacts.1': 'Знам какво искам в бъдещи срещи',
    'suggestions.date.goodFacts.2': 'Готов съм за някой, който цени времето ни заедно',
    'suggestions.date.lessons.0': 'Срещите трябва да бъдат желани, а не налагани',
    'suggestions.date.lessons.1': 'Усилията в планирането показват грижа',
    'suggestions.date.lessons.2': 'Заслужавам някой, който е въодушевен да прекарва време с мен',
    'suggestions.gift.hardTruths.0': 'Никога не влагаха мисъл в подаръците си към мен',
    'suggestions.gift.hardTruths.1': 'Моите подаръци към тях бяха по-значими от техните към мен',
    'suggestions.gift.hardTruths.2': 'Даряването на подаръци стана едностранно',
    'suggestions.gift.goodFacts.0': 'Научих радостта от даряването без очаквания',
    'suggestions.gift.goodFacts.1': 'Оценявам хора, които помнят специални случаи',
    'suggestions.gift.goodFacts.2': 'Сега мога да си правя значими подаръци',
    'suggestions.gift.lessons.0': 'Подаръците отразяват замисленост и грижа',
    'suggestions.gift.lessons.1': 'Заслужавам някой, който влага усилия да ме направи щастлив',
    'suggestions.gift.lessons.2': 'Материалните неща имат по-малко значение от жеста',
    'suggestions.text.hardTruths.0': 'Оставяха съобщенията ми непрочетени в продължение на дни',
    'suggestions.text.hardTruths.1': 'Едносричните отговори показваха тяхното незаинтересованост',
    'suggestions.text.hardTruths.2': 'Винаги аз започвах разговорите',
    'suggestions.text.goodFacts.0': 'Спрях да чакам отговори, които никога не дойдоха',
    'suggestions.text.goodFacts.1': 'Научих, че моята стойност не се измерва от времето за отговор',
    'suggestions.text.goodFacts.2': 'Намерих хора, които наистина искат да разговарят с мен',
    'suggestions.text.lessons.0': 'Комуникацията трябва да бъде двупосочна',
    'suggestions.text.lessons.1': 'Ако искаха, щяха да го направят',
    'suggestions.text.lessons.2': 'Заслужавам ентусиазирани партньори за разговор',
    'suggestions.call.hardTruths.0': 'Никога не отговаряха, когато се нуждаех от тях',
    'suggestions.call.hardTruths.1': 'Телефонните разговори станаха едностранни монолози',
    'suggestions.call.hardTruths.2': 'Спрях да звъня, защото те никога не звъняха обратно',
    'suggestions.call.goodFacts.0': 'Намерих хора, които отговарят, когато звъня',
    'suggestions.call.goodFacts.1': 'Научих се да разчитам повече на себе си',
    'suggestions.call.goodFacts.2': 'Не чакам обаждания, които няма да дойдат',
    'suggestions.call.lessons.0': 'Достъпността има значение във взаимоотношенията',
    'suggestions.call.lessons.1': 'Заслужавам хора, които искат да чуят от мен',
    'suggestions.call.lessons.2': 'Телефонните обаждания трябва да бъдат желани, а не избягвани',
    'suggestions.party.hardTruths.0': 'Игнорираха ме на партита, на които присъствахме заедно',
    'suggestions.party.hardTruths.1': 'Усетих се като непознат на собствените ни събития',
    'suggestions.party.hardTruths.2': 'Те общуваха, докато аз се чувствах невидим',
    'suggestions.party.goodFacts.0': 'Научих се да се наслаждавам на партита независимо',
    'suggestions.party.goodFacts.1': 'Мога да се забавлявам без тяхното одобрение',
    'suggestions.party.goodFacts.2': 'Открих, че всъщност съм добър в общуването сам',
    'suggestions.party.lessons.0': 'Партньорите трябва да правят един друг да се чувстват включени',
    'suggestions.party.lessons.1': 'Мога да процъфтявам в социални ситуации независимо',
    'suggestions.party.lessons.2': 'Заслужавам някой, който иска да бъда до него',
    'suggestions.coffee.hardTruths.0': 'Нашите кафе срещи станаха неудобни мълчания',
    'suggestions.coffee.hardTruths.1': 'Винаги изглеждаха разсеяни по време на нашите разговори',
    'suggestions.coffee.hardTruths.2': 'Забелязах, че предпочитат да бъдат навсякъде другаде',
    'suggestions.coffee.goodFacts.0': 'Научих се да се наслаждавам на кафе сам',
    'suggestions.coffee.goodFacts.1': 'Кафенетата станаха моето спокойно пространство',
    'suggestions.coffee.goodFacts.2': 'Мога да водя значими разговори със себе си',
    'suggestions.coffee.lessons.0': 'Простите моменти трябва да се усещат удобни',
    'suggestions.coffee.lessons.1': 'Присъствието е по-важно от мястото',
    'suggestions.coffee.lessons.2': 'Заслужавам завладяващи разговори над кафе',
    'suggestions.school.hardTruths.0': 'Не подкрепяха моите образователни цели',
    'suggestions.school.hardTruths.1': 'Ученето ми стана източник на конфликт',
    'suggestions.school.hardTruths.2': 'Виждаха амбициите ми като заплаха',
    'suggestions.school.goodFacts.0': 'Продължих образованието си за себе си',
    'suggestions.school.goodFacts.1': 'Ученето ми дава смисъл и растеж',
    'suggestions.school.goodFacts.2': 'Образованието е инвестиция в бъдещето ми',
    'suggestions.school.lessons.0': 'Партньорът трябва да подкрепя моя растеж',
    'suggestions.school.lessons.1': 'Образованието е ненадминаемо',
    'suggestions.school.lessons.2': 'Изграждам по-добро бъдеще за себе си',
    'suggestions.gym.hardTruths.0': 'Критикуваха целите ми за фитнес',
    'suggestions.gym.hardTruths.1': 'Тренировките станаха нещо, което криех от тях',
    'suggestions.gym.hardTruths.2': 'Накараха ме да се чувствам самосъзнателно за тялото си',
    'suggestions.gym.goodFacts.0': 'Тренирам за менталното и физическото си здраве',
    'suggestions.gym.goodFacts.1': 'Фитнесът стана моето убежище',
    'suggestions.gym.goodFacts.2': 'Изграждам сила отвътре и отвън',
    'suggestions.gym.lessons.0': 'Самоусъвършенстването трябва да бъде насърчавано',
    'suggestions.gym.lessons.1': 'Моите цели за тялото са само мои',
    'suggestions.gym.lessons.2': 'Партньорът трябва да ме издига, а не да ме сваля',
    'suggestions.music.hardTruths.0': 'Нашите песни станаха твърде болезнени за слушане',
    'suggestions.music.hardTruths.1': 'Музиката, която открихме заедно, сега предизвиква тъга',
    'suggestions.music.hardTruths.2': 'Развалиха изпълнители, които веднъж обичах',
    'suggestions.music.goodFacts.0': 'Откривам нова музика, която е само моя',
    'suggestions.music.goodFacts.1': 'Музиката все още ме вълнува дълбоко',
    'suggestions.music.goodFacts.2': 'Мога да намеря нов смисъл в стари песни',
    'suggestions.music.lessons.0': 'Музиката може да бъде върната и предефинирана',
    'suggestions.music.lessons.1': 'Изкуството е мое, а не нашите спомени',
    'suggestions.music.lessons.2': 'Новите песни могат да създават нови асоциации',
    'suggestions.movie.hardTruths.0': 'Вечерите с филми станаха самотни преживявания',
    'suggestions.movie.hardTruths.1': 'Предпочитаха да гледат сам, отколкото с мен',
    'suggestions.movie.hardTruths.2': 'Нашите споделени интереси не се превърнаха в качествено време',
    'suggestions.movie.goodFacts.0': 'Мога да се наслаждавам на филми сам',
    'suggestions.movie.goodFacts.1': 'Киносалоните станаха моето бягство',
    'suggestions.movie.goodFacts.2': 'Откривам нови любими независимо',
    'suggestions.movie.lessons.0': 'Споделените интереси се нуждаят от споделени усилия',
    'suggestions.movie.lessons.1': 'Мога да намеря радост в самостоятелно забавление',
    'suggestions.movie.lessons.2': 'Качественото време е по-важно от дейността',
    'suggestions.photo.hardTruths.0': 'Гледането на стари снимки носи повече болка, отколкото радост',
    'suggestions.photo.hardTruths.1': 'Изтриха нашите спомени без колебание',
    'suggestions.photo.hardTruths.2': 'Снимките разкриха истини, които не можех да видя преди',
    'suggestions.photo.goodFacts.0': 'Правя нови снимки на живота си сега',
    'suggestions.photo.goodFacts.1': 'Снимките документират моя растеж и изцеление',
    'suggestions.photo.goodFacts.2': 'Мога да гледам назад с яснота вместо болка',
    'suggestions.photo.lessons.0': 'Снимките улавят моменти, не постоянство',
    'suggestions.photo.lessons.1': 'Създавам нови спомени, които заслужават да бъдат снимани',
    'suggestions.photo.lessons.2': 'Миналото е свършено, но имам бъдеще',
    'suggestions.travel.hardTruths.0': 'Пътуването, за което мечтаехме, никога няма да се случи',
    'suggestions.travel.hardTruths.1': 'Плановете за пътуване умряха с връзката',
    'suggestions.travel.hardTruths.2': 'Отидоха на приключения, от които бях изключен',
    'suggestions.travel.goodFacts.0': 'Планирам пътувания само за мен',
    'suggestions.travel.goodFacts.1': 'Пътуването сам е освобождаващо',
    'suggestions.travel.goodFacts.2': 'Светът все още е пълен с места за откриване',
    'suggestions.travel.lessons.0': 'Мога да изследвам света сам',
    'suggestions.travel.lessons.1': 'Приключението не изисква партньор',
    'suggestions.travel.lessons.2': 'Пътуването лекува и разширява перспективите',
    'suggestions.airport.hardTruths.0': 'Никога не дойдоха да ме вземат',
    'suggestions.airport.hardTruths.1': 'Сбогуванията на летището разкриха техните истински чувства',
    'suggestions.airport.hardTruths.2': 'Пътуването да ги видя винаги беше едностранно усилие',
    'suggestions.airport.goodFacts.0': 'Научих се да се ориентирам на летищата независимо',
    'suggestions.airport.goodFacts.1': 'Летищата символизират моята свобода сега',
    'suggestions.airport.goodFacts.2': 'Мога да пътувам където искам, когато искам',
    'suggestions.airport.lessons.0': 'Усилията трябва да бъдат взаимни в дългите разстояния',
    'suggestions.airport.lessons.1': 'Свободен съм да отида навсякъде без разрешение',
    'suggestions.airport.lessons.2': 'Пътуването представлява моята независимост',
    'suggestions.beach.hardTruths.0': 'Нашите плажни спомени сега са горчиво-сладки',
    'suggestions.beach.hardTruths.1': 'Океанът ми напомня за обещания, които се измиха',
    'suggestions.beach.hardTruths.2': 'Обичаха плажа повече, отколкото обичаха мен',
    'suggestions.beach.goodFacts.0': 'Океанът все още ми носи мир',
    'suggestions.beach.goodFacts.1': 'Плажовете са места на обновление и изцеление',
    'suggestions.beach.goodFacts.2': 'Водата има начин да измие болката',
    'suggestions.beach.lessons.0': 'Природата лекува независимо от кой е до мен',
    'suggestions.beach.lessons.1': 'Необятността на океана поставя нещата в перспектива',
    'suggestions.beach.lessons.2': 'Мога да намеря мир на същите места отново',
    'suggestions.park.hardTruths.0': 'Разходките в парковете ми напомняха какво загубих',
    'suggestions.park.hardTruths.1': 'Природата се усещаше празна без тях',
    'suggestions.park.hardTruths.2': 'Нашите любими места станаха места за избягване',
    'suggestions.park.goodFacts.0': 'Природата все още ми носи мир и яснота',
    'suggestions.park.goodFacts.1': 'Парковете са места на изцеление и размисъл',
    'suggestions.park.goodFacts.2': 'Намирам нови любими места',
    'suggestions.park.lessons.0': 'Природата принадлежи на всички',
    'suggestions.park.lessons.1': 'На открито мога да бъде върнат за себе си',
    'suggestions.park.lessons.2': 'Мирът идва отвътре, не от компанията',
    'suggestions.shopping.hardTruths.0': 'Пазаруването заедно стана задача за тях',
    'suggestions.shopping.hardTruths.1': 'Критикуваха моите избори и предпочитания',
    'suggestions.shopping.hardTruths.2': 'Нашите стилове отразяваха нашата несъвместимост',
    'suggestions.shopping.goodFacts.0': 'Развивам собствен уникален стил',
    'suggestions.shopping.goodFacts.1': 'Пазаруването сега е форма на самовыражение',
    'suggestions.shopping.goodFacts.2': 'Мога да купувам това, което ме прави щастлив, без осъждане',
    'suggestions.shopping.lessons.0': 'Личният стил е за самовыражение',
    'suggestions.shopping.lessons.1': 'Не ми трябва одобрение за моите избори',
    'suggestions.shopping.lessons.2': 'Пазаруването сам може да бъде овластяващо',
    'suggestions.car.hardTruths.0': 'Никога не искаха да карат да ме видят',
    'suggestions.car.hardTruths.1': 'Пътуванията с кола станаха мълчаливи и напрегнати',
    'suggestions.car.hardTruths.2': 'Колата, която споделяхме, сега крие болезнени спомени',
    'suggestions.car.goodFacts.0': 'Имам свобода да отида навсякъде',
    'suggestions.car.goodFacts.1': 'Шофирането сам е мирно и освобождаващо',
    'suggestions.car.goodFacts.2': 'Пътят напред е мой за избор',
    'suggestions.car.lessons.0': 'Независимостта означава да вървя по собствения си път',
    'suggestions.car.lessons.1': 'Аз контролирам накъде се насочвам',
    'suggestions.car.lessons.2': 'Пътуването е по-важно от това кой е на седалката на пътника',
    'suggestions.game.hardTruths.0': 'Никога не искаха да играят с мен',
    'suggestions.game.hardTruths.1': 'Игрите станаха начин да ме избягват',
    'suggestions.game.hardTruths.2': 'Нашите интереси се разминаха напълно',
    'suggestions.game.goodFacts.0': 'Наслаждавам се на игрите на собствените си условия',
    'suggestions.game.goodFacts.1': 'Игрите са здравословно бягство и забавление',
    'suggestions.game.goodFacts.2': 'Мога да намеря общности, които споделят моите интереси',
    'suggestions.game.lessons.0': 'Хобитата не изискват участие на партньор',
    'suggestions.game.lessons.1': 'Мога да се наслаждавам на интересите си независимо',
    'suggestions.game.lessons.2': 'Споделените интереси не са необходими за съвместимост',
    'suggestions.default.hardTruths.0': 'Игнорирах знаците, които винаги са били там',
    'suggestions.default.hardTruths.1': 'Останах по-дълго, отколкото трябваше',
    'suggestions.default.hardTruths.2': 'Компрометирах твърде много от себе си',
    'suggestions.default.goodFacts.0': 'Научих какво наистина ми трябва във връзка',
    'suggestions.default.goodFacts.1': 'Станах по-силен чрез този опит',
    'suggestions.default.goodFacts.2': 'На една стъпка съм по-близо до правилния човек',
    'suggestions.default.lessons.0': 'Растежът идва от най-трудните преживявания',
    'suggestions.default.lessons.1': 'Заслужавам по-добро от това, което приех',
    'suggestions.default.lessons.2': 'Изцелението е пътуване, не дестинация',
    'suggestions.kiss.hardTruths.0': 'Нашите целувки загубиха значението си с времето',
    'suggestions.kiss.hardTruths.1': 'Целувах ги, но не усетих нищо',
    'suggestions.kiss.hardTruths.2': 'Страстта, която някога имахме, изчезна',
    'suggestions.kiss.goodFacts.0': 'Помня какво е истинската връзка',
    'suggestions.kiss.goodFacts.1': 'Знам, че заслужавам страстни, значими целувки',
    'suggestions.kiss.goodFacts.2': 'Физическата интимност трябва да идва от емоционална връзка',
    'suggestions.kiss.lessons.0': 'Целувката трябва да означава нещо',
    'suggestions.kiss.lessons.1': 'Физическата връзка без емоционална връзка е празна',
    'suggestions.kiss.lessons.2': 'Заслужавам някой, който ме целува, сякаш наистина го означава',
    'suggestions.hug.hardTruths.0': 'Техните прегръдки се усещаха далечни и наложени',
    'suggestions.hug.hardTruths.1': 'Прегърнах ги, но се усетих сам',
    'suggestions.hug.hardTruths.2': 'Топлината, която някога споделяхме, изчезна',
    'suggestions.hug.goodFacts.0': 'Помня какво е истинският комфорт',
    'suggestions.hug.goodFacts.1': 'Знам, че заслужавам топли, значими прегръдки',
    'suggestions.hug.goodFacts.2': 'Прегръдката трябва да те кара да се чувстваш сигурен и обичан',
    'suggestions.hug.lessons.0': 'Физическото докосване трябва да предава грижа',
    'suggestions.hug.lessons.1': 'Заслужавам някой, който ме държи, сякаш наистина го означава',
    'suggestions.hug.lessons.2': 'Комфортът идва от истинска връзка, не от задължение',
    'suggestions.cuddle.hardTruths.0': 'Гушкането стана задача, а не комфорт',
    'suggestions.cuddle.hardTruths.1': 'Усетих тяхното разстояние, дори когато бяхме близо',
    'suggestions.cuddle.hardTruths.2': 'Интимността, която споделяхме, се усещаше едностранна',
    'suggestions.cuddle.goodFacts.0': 'Помня какво е истинската близост',
    'suggestions.cuddle.goodFacts.1': 'Знам, че заслужавам някой, който иска да бъде близо',
    'suggestions.cuddle.goodFacts.2': 'Физическата близост трябва да отразява емоционална близост',
    'suggestions.cuddle.lessons.0': 'Интимността изисква взаимно желание',
    'suggestions.cuddle.lessons.1': 'Заслужавам някой, който иска да бъде до мен',
    'suggestions.cuddle.lessons.2': 'Близостта трябва да се усеща естествена, а не наложена',
    'suggestions.morning.hardTruths.0': 'Сутрините заедно станаха неудобни и мълчаливи',
    'suggestions.morning.hardTruths.1': 'Събудих се до тях, но се усетих сам',
    'suggestions.morning.hardTruths.2': 'Сутрешното светло разкри какво станахме',
    'suggestions.morning.goodFacts.0': 'Сега мога да се наслаждавам на мирни сутрини сам',
    'suggestions.morning.goodFacts.1': 'Сутрините са свежо начало, нов старт',
    'suggestions.morning.goodFacts.2': 'Изграждам сутрешна рутина, която е само моя',
    'suggestions.morning.lessons.0': 'Как започваш деня задава тона',
    'suggestions.morning.lessons.1': 'Заслужавам мирни, значими сутрини',
    'suggestions.morning.lessons.2': 'Нов ден означава нов шанс за изцеление',
    'suggestions.night.hardTruths.0': 'Нощите заедно станаха самотни и студени',
    'suggestions.night.hardTruths.1': 'Лежах буден до тях, чувствайки се откъснат',
    'suggestions.night.hardTruths.2': 'Тъмнината не можеше да скрие нашето разстояние',
    'suggestions.night.goodFacts.0': 'Сега мога да спя мирно сам',
    'suggestions.night.goodFacts.1': 'Нощите са за почивка и възстановяване',
    'suggestions.night.goodFacts.2': 'Уча се да намирам мир в тишината',
    'suggestions.night.lessons.0': 'Почивката трябва да бъде възстановителна, а не стресираща',
    'suggestions.night.lessons.1': 'Заслужавам мирни нощи и спокоен сън',
    'suggestions.night.lessons.2': 'Нощта носи яснота и размисъл',
    'suggestions.weekend.hardTruths.0': 'Уикендите заедно станаха задължения, а не радости',
    'suggestions.weekend.hardTruths.1': 'Прекарвах уикендите, чакайки да се появят',
    'suggestions.weekend.hardTruths.2': 'Свободното ни време заедно се усещаше пропиляно',
    'suggestions.weekend.goodFacts.0': 'Възвърнах уикендите си за себе си',
    'suggestions.weekend.goodFacts.1': 'Уикендите са мои да ги наслаждавам както искам',
    'suggestions.weekend.goodFacts.2': 'Откривам нови начини да прекарвам свободното си време',
    'suggestions.weekend.lessons.0': 'Свободното време трябва да се прекарва с хора, които го ценят',
    'suggestions.weekend.lessons.1': 'Заслужавам някой, който е въодушевен да прекарва уикендите с мен',
    'suggestions.weekend.lessons.2': 'Уикендите са за почивка, радост и връзка',
    'suggestions.sunset.hardTruths.0': 'Залезите, които гледахме заедно, сега ми напомнят какво загубих',
    'suggestions.sunset.hardTruths.1': 'Красотата се усещаше празна без истинска връзка',
    'suggestions.sunset.hardTruths.2': 'Гледах залези сам, липсвайки какво имахме',
    'suggestions.sunset.goodFacts.0': 'Залезите все още ми носят мир и красота',
    'suggestions.sunset.goodFacts.1': 'Мога да оценя красотата на природата сам',
    'suggestions.sunset.goodFacts.2': 'Всеки залез е напомняне, че краищата могат да бъдат красиви',
    'suggestions.sunset.lessons.0': 'Красотата съществува независимо от кой е до мен',
    'suggestions.sunset.lessons.1': 'Краищата могат да бъдат толкова красиви, колкото и началата',
    'suggestions.sunset.lessons.2': 'Мога да намеря мир в ритмите на природата',
    'suggestions.sunrise.hardTruths.0': 'Изгревите, които споделяхме, сега са горчиво-сладки спомени',
    'suggestions.sunrise.hardTruths.1': 'Новият ден се усещаше празен без тях',
    'suggestions.sunrise.hardTruths.2': 'Гледах изгреви сам, чувствайки загубата',
    'suggestions.sunrise.goodFacts.0': 'Изгревите представляват нови начала и надежда',
    'suggestions.sunrise.goodFacts.1': 'Всеки изгрев е свеж старт',
    'suggestions.sunrise.goodFacts.2': 'Мога да намеря надежда в зората на нов ден',
    'suggestions.sunrise.lessons.0': 'Всеки изгрев носи нови възможности',
    'suggestions.sunrise.lessons.1': 'Новите начала винаги са възможни',
    'suggestions.sunrise.lessons.2': 'Надеждата идва с всеки нов ден',
    'suggestions.rain.hardTruths.0': 'Дъждовните дни заедно се усещаха мрачни и тъжни',
    'suggestions.rain.hardTruths.1': 'Дъждът съответстваше на нашето настроение и разстояние',
    'suggestions.rain.hardTruths.2': 'Останахме вътре, но се чувствахме светове далеч',
    'suggestions.rain.goodFacts.0': 'Дъждът може да бъде мирен и очистващ',
    'suggestions.rain.goodFacts.1': 'Мога да се наслаждавам на дъждовни дни сам, намирайки комфорт',
    'suggestions.rain.goodFacts.2': 'Дъждът измива старото, правейки път за нов растеж',
    'suggestions.rain.lessons.0': 'Дъждът може да бъде очистващ и обновяващ',
    'suggestions.rain.lessons.1': 'Мога да намеря мир в звука на дъжда',
    'suggestions.rain.lessons.2': 'Бурите минават, и растежът следва',
    'suggestions.snow.hardTruths.0': 'Снежните дни, които планирахме, никога не се случиха',
    'suggestions.snow.hardTruths.1': 'Снегът ми напомни за студенината между нас',
    'suggestions.snow.hardTruths.2': 'Зимата дойде, но нашата топлина изчезна',
    'suggestions.snow.goodFacts.0': 'Снегът може да бъде красив и мирен',
    'suggestions.snow.goodFacts.1': 'Мога да се наслаждавам на зимната красота сам',
    'suggestions.snow.goodFacts.2': 'Снегът покрива всичко, давайки свеж старт',
    'suggestions.snow.lessons.0': 'Красотата съществува дори в студени времена',
    'suggestions.snow.lessons.1': 'Мога да намеря радост в тихата красота на зимата',
    'suggestions.snow.lessons.2': 'Свежите стартове идват в много форми',
    'suggestions.storm.hardTruths.0': 'Бурите навън отразяваха бурите между нас',
    'suggestions.storm.hardTruths.1': 'Преживяхме бури, но загубихме връзката си',
    'suggestions.storm.hardTruths.2': 'Хаосът навън съответстваше на нашата вътрешна буря',
    'suggestions.storm.goodFacts.0': 'Преживях емоционални бури и оцелях',
    'suggestions.storm.goodFacts.1': 'Бурите минават, и спокойствието следва',
    'suggestions.storm.goodFacts.2': 'По-силен съм, защото преживях бурята',
    'suggestions.storm.lessons.0': 'Бурите разкриват какво е наистина силно',
    'suggestions.storm.lessons.1': 'Мога да преживея всяка буря, която дойде',
    'suggestions.storm.lessons.2': 'След бурята идва мир и яснота',
    'suggestions.breakfast.hardTruths.0': 'Закуските заедно станаха мълчаливи и неудобни',
    'suggestions.breakfast.hardTruths.1': 'Ядох сам, дори когато те бяха там',
    'suggestions.breakfast.hardTruths.2': 'Сутрешните ястия подчертаха нашето разстояние',
    'suggestions.breakfast.goodFacts.0': 'Мога да се наслаждавам на закуска сам, мирно',
    'suggestions.breakfast.goodFacts.1': 'Закуската е просто удоволствие, което мога да си дам',
    'suggestions.breakfast.goodFacts.2': 'Изграждам сутрешни рутини, които ме хранят',
    'suggestions.breakfast.lessons.0': 'Простите удоволствия не изискват компания',
    'suggestions.breakfast.lessons.1': 'Мога да намеря радост в тихите сутрешни моменти',
    'suggestions.breakfast.lessons.2': 'Самообгрижването започва с прости актове като закуска',
    'suggestions.dinner.hardTruths.0': 'Вечерите заедно станаха напрегнати и неудобни',
    'suggestions.dinner.hardTruths.1': 'Готвех за нас, но ядох сам емоционално',
    'suggestions.dinner.hardTruths.2': 'Ястията станаха напомняния за какво загубихме',
    'suggestions.dinner.goodFacts.0': 'Мога да се наслаждавам на готвене и ядене за себе си',
    'suggestions.dinner.goodFacts.1': 'Вечерята сам може да бъде мирна и удовлетворяваща',
    'suggestions.dinner.goodFacts.2': 'Откривам нови рецепти и вкусове',
    'suggestions.dinner.lessons.0': 'Храната трябва да се наслаждава, а не да се търпи',
    'suggestions.dinner.lessons.1': 'Мога да намеря удоволствие в самостоятелното хранене',
    'suggestions.dinner.lessons.2': 'Готвенето за себе си е акт на самообгрижаване',
    'suggestions.email.hardTruths.0': 'Никога не отговориха на моите важни имейли',
    'suggestions.email.hardTruths.1': 'Имейл комуникацията стана едностранна',
    'suggestions.email.hardTruths.2': 'Изпращах съобщения, които никога не бяха признати',
    'suggestions.email.goodFacts.0': 'Спрях да чакам отговори, които никога не дойдоха',
    'suggestions.email.goodFacts.1': 'Намерих хора, които наистина отговарят',
    'suggestions.email.goodFacts.2': 'Комуникацията трябва да бъде взаимна, а не едностранна',
    'suggestions.email.lessons.0': 'Ако искаха, щяха да отговорят',
    'suggestions.email.lessons.1': 'Заслужавам хора, които ценят комуникацията',
    'suggestions.email.lessons.2': 'Едностранната комуникация изобщо не е комуникация',
    'suggestions.video.hardTruths.0': 'Видео разговорите станаха неудобни и наложени',
    'suggestions.video.hardTruths.1': 'Никога не искаха да видео чатват с мен',
    'suggestions.video.hardTruths.2': 'Гледането на лицето им ми напомни за разстоянието',
    'suggestions.video.goodFacts.0': 'Мога да се свържа с хора, които искат да ме видят',
    'suggestions.video.goodFacts.1': 'Видео разговорите трябва да бъдат желани, а не наложени',
    'suggestions.video.goodFacts.2': 'Намерих хора, въодушевени да видео чатват',
    'suggestions.video.lessons.0': 'Визуалната връзка трябва да се усеща естествена',
    'suggestions.video.lessons.1': 'Заслужавам някой, който иска да види лицето ми',
    'suggestions.video.lessons.2': 'Технологията не може да замени истинската връзка',
    'suggestions.spring.hardTruths.0': 'Пролетта донесе нов живот, но нашата връзка умираше',
    'suggestions.spring.hardTruths.1': 'Обновлението около нас подчерта какво загубихме',
    'suggestions.spring.hardTruths.2': 'Пролетните цветя цъфтяха, докато ние увяхвахме',
    'suggestions.spring.goodFacts.0': 'Пролетта представлява нови начала и растеж',
    'suggestions.spring.goodFacts.1': 'Мога да намеря обновление в енергията на пролетта',
    'suggestions.spring.goodFacts.2': 'Нов живот е възможен, точно като пролетта',
    'suggestions.spring.lessons.0': 'Пролетта учи, че обновлението винаги е възможно',
    'suggestions.spring.lessons.1': 'Мога да цъфтя отново, като пролетните цветя',
    'suggestions.spring.lessons.2': 'Новите начала идват с всеки сезон',
    'suggestions.summer.hardTruths.0': 'Лятната топлина не можеше да затопли нашата студена връзка',
    'suggestions.summer.hardTruths.1': 'Летните планове, които направихме, никога не се случиха',
    'suggestions.summer.hardTruths.2': 'Топлината на лятото подчерта нашето разстояние',
    'suggestions.summer.goodFacts.0': 'Лятото носи енергия и приключение',
    'suggestions.summer.goodFacts.1': 'Мога да се наслаждавам на лятната топлина сам',
    'suggestions.summer.goodFacts.2': 'Лятото е време за нови преживявания',
    'suggestions.summer.lessons.0': 'Мога да намеря радост в енергията на лятото',
    'suggestions.summer.lessons.1': 'Приключението не изисква партньор',
    'suggestions.summer.lessons.2': 'Лятото учи, че топлината идва отвътре',
    'suggestions.winter.hardTruths.0': 'Зимният студ съответстваше на студенината между нас',
    'suggestions.winter.hardTruths.1': 'Останахме вътре, но се чувствахме светове далеч',
    'suggestions.winter.hardTruths.2': 'Зимните празници подчертаха нашето откъсване',
    'suggestions.winter.goodFacts.0': 'Зимата може да бъде мирна и размишляваща',
    'suggestions.winter.goodFacts.1': 'Мога да намеря комфорт в тишината на зимата',
    'suggestions.winter.goodFacts.2': 'Зимата учи, че почивката е необходима',
    'suggestions.winter.lessons.0': 'Студените времена могат да бъдат времена на растеж',
    'suggestions.winter.lessons.1': 'Мога да намеря топлина дори през зимата',
    'suggestions.winter.lessons.2': 'Почивката и размишлението са част от изцелението',
    'suggestions.autumn.hardTruths.0': 'Есенното падане на листата отразяваше нашето падане във връзката',
    'suggestions.autumn.hardTruths.1': 'Красотата на промяната подчерта какво загубихме',
    'suggestions.autumn.hardTruths.2': 'Есента дойде, но не можехме да пуснем',
    'suggestions.autumn.goodFacts.0': 'Есента учи, че пускането може да бъде красиво',
    'suggestions.autumn.goodFacts.1': 'Мога да намеря красота в промяната и прехода',
    'suggestions.autumn.goodFacts.2': 'Падащите листа правят път за нов растеж',
    'suggestions.autumn.lessons.0': 'Промяната може да бъде красива, не само болезнена',
    'suggestions.autumn.lessons.1': 'Пускането прави място за нов растеж',
    'suggestions.autumn.lessons.2': 'Преходите са част от естествения цикъл на живота',
    'suggestions.goodbye.hardTruths.0': 'Нашето сбогуване беше по-трудно, отколкото трябваше да бъде',
    'suggestions.goodbye.hardTruths.1': 'Сбогувах се, но не исках да пусна',
    'suggestions.goodbye.hardTruths.2': 'Сбогуването разкри какво наистина загубихме',
    'suggestions.goodbye.goodFacts.0': 'Намерих силата да се сбогувам',
    'suggestions.goodbye.goodFacts.1': 'Сбогуванията са необходими за нови начала',
    'suggestions.goodbye.goodFacts.2': 'Почетох какво имахме, като го пуснах',
    'suggestions.goodbye.lessons.0': 'Сбогуванията могат да бъдат актове на самолюбие',
    'suggestions.goodbye.lessons.1': 'Пускането понякога е най-милостивият избор',
    'suggestions.goodbye.lessons.2': 'Краищата правят място за нови начала',
    'suggestions.first.hardTruths.0': 'Нашите първи пъти заедно загубиха значението си',
    'suggestions.first.hardTruths.1': 'Първите преживявания станаха последни преживявания',
    'suggestions.first.hardTruths.2': 'Магията на първите избледня твърде бързо',
    'suggestions.first.goodFacts.0': 'Помня вълнението от нашите първи',
    'suggestions.first.goodFacts.1': 'Първите преживявания ме научиха какво искам',
    'suggestions.first.goodFacts.2': 'Отворен съм за нови първи с правилния човек',
    'suggestions.first.lessons.0': 'Първите трябва да бъдат специални и значими',
    'suggestions.first.lessons.1': 'Заслужавам някой, който прави първите запомнящи се',
    'suggestions.first.lessons.2': 'Магията на първите трябва да трае',
    'suggestions.last.hardTruths.0': 'Не знаех, че последният ни път заедно ще бъде последният',
    'suggestions.last.hardTruths.1': 'Последните моменти разкриха какво станахме',
    'suggestions.last.hardTruths.2': 'Исках да знаех, че това е последният ни път',
    'suggestions.last.goodFacts.0': 'Мога да почета последните ни моменти с грация',
    'suggestions.last.goodFacts.1': 'Последните правят път за нови първи',
    'suggestions.last.goodFacts.2': 'Готов съм за нови преживявания',
    'suggestions.last.lessons.0': 'Понякога не знаем кога е последният път',
    'suggestions.last.lessons.1': 'Мога да намеря мир в приемане на краищата',
    'suggestions.last.lessons.2': 'След последното идва първото на нещо ново',
    'suggestions.together.hardTruths.0': 'Биенето заедно загуби значението си',
    'suggestions.together.hardTruths.1': 'Бяхме заедно, но се чувствахме сам',
    'suggestions.together.hardTruths.2': 'Заедно стана тежест, а не радост',
    'suggestions.together.goodFacts.0': 'Помня какво е истинската заедно',
    'suggestions.together.goodFacts.1': 'Знам, че заслужавам истинска връзка',
    'suggestions.together.goodFacts.2': 'Заедно трябва да означава нещо истинско',
    'suggestions.together.lessons.0': 'Заедно изисква взаимни усилия',
    'suggestions.together.lessons.1': 'Заслужавам някой, който иска да бъде заедно',
    'suggestions.together.lessons.2': 'Биенето заедно трябва да се усеща естествено, а не наложено',
    'suggestions.dream.hardTruths.0': 'Нашите споделени мечти никога не се сбъднаха',
    'suggestions.dream.hardTruths.1': 'Мечтаех сам, докато те мечтаеха различно',
    'suggestions.dream.hardTruths.2': 'Бъдещето, което планирахме, никога няма да се случи',
    'suggestions.dream.goodFacts.0': 'Мога да мечтая нови мечти за себе си',
    'suggestions.dream.goodFacts.1': 'Моите мечти все още са валидни и постижими',
    'suggestions.dream.goodFacts.2': 'Изграждам бъдеще, което наистина искам',
    'suggestions.dream.lessons.0': 'Мечтите трябва да бъдат споделени, а не компрометирани',
    'suggestions.dream.lessons.1': 'Мога да постигна мечтите си независимо',
    'suggestions.dream.lessons.2': 'Новите мечти могат да заменят старите',
    'suggestions.laugh.hardTruths.0': 'Нашият смях заедно стана наложен и рядък',
    'suggestions.laugh.hardTruths.1': 'Смеех се сам повече, отколкото с тях',
    'suggestions.laugh.hardTruths.2': 'Радостта, която някога споделяхме, изчезна',
    'suggestions.laugh.goodFacts.0': 'Все още мога да намеря неща, за които да се смея',
    'suggestions.laugh.goodFacts.1': 'Смяхът е изцеляващ и необходим',
    'suggestions.laugh.goodFacts.2': 'Намирам радост на неочаквани места',
    'suggestions.laugh.lessons.0': 'Смяхът трябва да идва естествено, а не да бъде наложен',
    'suggestions.laugh.lessons.1': 'Заслужавам някой, който ме кара да се смея',
    'suggestions.laugh.lessons.2': 'Радостта е от съществено значение за всяка връзка',
    'suggestions.proposal.hardTruths.0': 'Предложението се усещаше наложено и очаквано, а не романтично',
    'suggestions.proposal.hardTruths.1': 'Казах да, но се усетих несигурен вътре',
    'suggestions.proposal.hardTruths.2': 'Моментът, за който мечтаех, се усещаше грешен',
    'suggestions.proposal.goodFacts.0': 'Почетох истинските си чувства, като бях честен',
    'suggestions.proposal.goodFacts.1': 'Научих, че времето и готовността имат значение',
    'suggestions.proposal.goodFacts.2': 'Мога да кажа не, за да защитя бъдещето си',
    'suggestions.proposal.lessons.0': 'Предложението трябва да се усеща правилно, а не прибързано',
    'suggestions.proposal.lessons.1': 'Заслужавам предложение, което съответства на мечтите ми',
    'suggestions.proposal.lessons.2': 'Да кажеш не може да бъде акт на самолюбие',
    'suggestions.engagement.hardTruths.0': 'Периодът на годежа разкри нашата несъвместимост',
    'suggestions.engagement.hardTruths.1': 'Усетих се в капан по време на това, което трябваше да бъде щастливо',
    'suggestions.engagement.hardTruths.2': 'Планирането на бъдеще заедно се усещаше грешно',
    'suggestions.engagement.goodFacts.0': 'Намерих смелостта да го приключа преди брака',
    'suggestions.engagement.goodFacts.1': 'Научих какво наистина искам в партньор',
    'suggestions.engagement.goodFacts.2': 'Спасих се от грешен брак',
    'suggestions.engagement.lessons.0': 'Годежът трябва да бъде време на радост, а не на съмнение',
    'suggestions.engagement.lessons.1': 'По-добре е да го приключиш преди, отколкото след брака',
    'suggestions.engagement.lessons.2': 'Заслужавам някой, с когото съм въодушевен да се оженя',
    'suggestions.ring.hardTruths.0': 'Пръстенът се усещаше като верига, а не като обещание',
    'suggestions.ring.hardTruths.1': 'Носех го, но не се чувствах ангажиран',
    'suggestions.ring.hardTruths.2': 'Символът означаваше повече за тях, отколкото за мен',
    'suggestions.ring.goodFacts.0': 'Върнах пръстена и възвърнах свободата си',
    'suggestions.ring.goodFacts.1': 'Научих, че символите не създават ангажираност',
    'suggestions.ring.goodFacts.2': 'Свободен съм да намеря някой, който наистина ми подхожда',
    'suggestions.ring.lessons.0': 'Пръстенът е просто символ, а не гаранция',
    'suggestions.ring.lessons.1': 'Истинската ангажираност идва от сърцето, а не от бижута',
    'suggestions.ring.lessons.2': 'Заслужавам някой, който иска да се ангажира, а не просто да изглежда ангажиран',
    'suggestions.divorce.hardTruths.0': 'Разводът беше по-труден, отколкото очаквах',
    'suggestions.divorce.hardTruths.1': 'Правният процес разкри колко далеч се бяхме отдалечили',
    'suggestions.divorce.hardTruths.2': 'Приключването на брак се усещаше като провал',
    'suggestions.divorce.goodFacts.0': 'Намерих сила през най-трудния процес',
    'suggestions.divorce.goodFacts.1': 'Изграждам нов живот, който е наистина мой',
    'suggestions.divorce.goodFacts.2': 'Научих, че краищата могат да бъдат начала',
    'suggestions.divorce.lessons.0': 'Разводът не е провал, той е ново начало',
    'suggestions.divorce.lessons.1': 'Мога да изградя живота си на собствените си условия',
    'suggestions.divorce.lessons.2': 'Свободата си струва болката от прехода',
    'suggestions.love.hardTruths.0': 'Обичах ги повече, отколкото те обичаха мен',
    'suggestions.love.hardTruths.1': 'Любовта не беше достатъчна да ни спаси',
    'suggestions.love.hardTruths.2': 'Обърках любовта с привързаност',
    'suggestions.love.goodFacts.0': 'Научих как изглежда истинската любов',
    'suggestions.love.goodFacts.1': 'Знам, че съм способен на дълбока любов',
    'suggestions.love.goodFacts.2': 'Отворен съм за любов отново, но по-мъдър',
    'suggestions.love.lessons.0': 'Любовта трябва да бъде взаимна, а не едностранна',
    'suggestions.love.lessons.1': 'Любовта сама по себе си не е достатъчна без уважение и съвместимост',
    'suggestions.love.lessons.2': 'Заслужавам някой, който ме обича толкова, колкото и аз го обичам',
    'suggestions.interview.hardTruths.0': 'Интервюто не мина добре, както се надявах',
    'suggestions.interview.hardTruths.1': 'Усетих се неподготвен и нервен',
    'suggestions.interview.hardTruths.2': 'Не получих работата, която исках',
    'suggestions.interview.goodFacts.0': 'Научих от преживяването',
    'suggestions.interview.goodFacts.1': 'Всяко интервю ме прави по-добър',
    'suggestions.interview.goodFacts.2': 'Изграждам умения за интервю',
    'suggestions.interview.lessons.0': 'Отхвърлянето е пренасочване',
    'suggestions.interview.lessons.1': 'Практиката прави перфектно',
    'suggestions.interview.lessons.2': 'Правилната възможност ще дойде',
    'suggestions.meeting.hardTruths.0': 'Работните срещи станаха стресиращи и изтощителни',
    'suggestions.meeting.hardTruths.1': 'Усетих се нечуван и подценен на срещи',
    'suggestions.meeting.hardTruths.2': 'Срещите подчертаха дисфункцията на работното място',
    'suggestions.meeting.goodFacts.0': 'Научих се да се застъпвам за себе си',
    'suggestions.meeting.goodFacts.1': 'Намерих гласа си в професионални среди',
    'suggestions.meeting.goodFacts.2': 'Изграждам увереност на срещи',
    'suggestions.meeting.lessons.0': 'Гласът ми има значение в професионални среди',
    'suggestions.meeting.lessons.1': 'Заслужавам да бъда чуван и ценен',
    'suggestions.meeting.lessons.2': 'Ефективната комуникация е умение, което мога да развия',
    'suggestions.project.hardTruths.0': 'Проектът не се получи, както беше планирано',
    'suggestions.project.hardTruths.1': 'Поех твърде много отговорност сам',
    'suggestions.project.hardTruths.2': 'Провалите на проектите се усещаха лични',
    'suggestions.project.goodFacts.0': 'Научих ценни уроци от преживяването',
    'suggestions.project.goodFacts.1': 'Изграждам устойчивост чрез предизвикателства',
    'suggestions.project.goodFacts.2': 'Всеки проект ме учи на нещо ново',
    'suggestions.project.lessons.0': 'Провалът е част от растежа',
    'suggestions.project.lessons.1': 'Мога да науча от неуспехите',
    'suggestions.project.lessons.2': 'Не всеки проект ще успее, и това е нормално',
    'suggestions.office.hardTruths.0': 'Офисната среда беше токсична и изтощителна',
    'suggestions.office.hardTruths.1': 'Усетих се изолиран и неподкрепен на работа',
    'suggestions.office.hardTruths.2': 'Офисната политика направи работата непоносима',
    'suggestions.office.goodFacts.0': 'Научих какво ми трябва в работна среда',
    'suggestions.office.goodFacts.1': 'Търся по-здрави работни места',
    'suggestions.office.goodFacts.2': 'Знам стойността си в професионални среди',
    'suggestions.office.lessons.0': 'Работната среда е толкова важна, колкото и самата работа',
    'suggestions.office.lessons.1': 'Заслужавам подкрепяща работна среда',
    'suggestions.office.lessons.2': 'Токсичните среди не си струват да оставаш в тях',
    'suggestions.boss.hardTruths.0': 'Шефът ми не оценяваше работата ми',
    'suggestions.boss.hardTruths.1': 'Усетих се микромениджван и подценен',
    'suggestions.boss.hardTruths.2': 'Връзката с шефа ми беше токсична',
    'suggestions.boss.goodFacts.0': 'Научих как изглежда доброто лидерство',
    'suggestions.boss.goodFacts.1': 'Знам, че заслужавам уважение от ръководители',
    'suggestions.boss.goodFacts.2': 'Изграждам граници в професионални взаимоотношения',
    'suggestions.boss.lessons.0': 'Добрият шеф трябва да подкрепя и развива екипа си',
    'suggestions.boss.lessons.1': 'Заслужавам уважителни професионални взаимоотношения',
    'suggestions.boss.lessons.2': 'Мога да намеря по-добро лидерство другаде',
    'suggestions.colleague.hardTruths.0': 'Работните колеги станаха конкурентни и неподкрепящи',
    'suggestions.colleague.hardTruths.1': 'Усетих се изключен от работни приятелства',
    'suggestions.colleague.hardTruths.2': 'Връзките с колегите бяха повърхностни',
    'suggestions.colleague.goodFacts.0': 'Научих се да поставям професионални граници',
    'suggestions.colleague.goodFacts.1': 'Намерих колеги, които ценят сътрудничеството',
    'suggestions.colleague.goodFacts.2': 'Изграждам истински професионални взаимоотношения',
    'suggestions.colleague.lessons.0': 'Работните взаимоотношения трябва да бъдат професионални, а не лични',
    'suggestions.colleague.lessons.1': 'Заслужавам подкрепящи колеги',
    'suggestions.colleague.lessons.2': 'Сътрудничеството побеждава конкуренцията',
    'suggestions.fired.hardTruths.0': 'Уволнението се усещаше като личен провал',
    'suggestions.fired.hardTruths.1': 'Загубих работата и увереността си',
    'suggestions.fired.hardTruths.2': 'Уволнението беше неочаквано и болезнено',
    'suggestions.fired.goodFacts.0': 'Научих, че уволнението не е отражение на стойността ми',
    'suggestions.fired.goodFacts.1': 'Намерих по-добри възможности след това',
    'suggestions.fired.goodFacts.2': 'Изграждам устойчивост чрез кариерни предизвикателства',
    'suggestions.fired.lessons.0': 'Уволнението може да бъде благословия под прикритие',
    'suggestions.fired.lessons.1': 'Стойността ми не се определя от една работа',
    'suggestions.fired.lessons.2': 'По-добри възможности очакват след неуспехите',
    'suggestions.parent.hardTruths.0': 'Родителят ми ме разочарова дълбоко',
    'suggestions.parent.hardTruths.1': 'Усетих се неподкрепен от родителя ми',
    'suggestions.parent.hardTruths.2': 'Връзката с родителя ми беше напрегната',
    'suggestions.parent.goodFacts.0': 'Научих се да поставям граници със семейството',
    'suggestions.parent.goodFacts.1': 'Намерих подкрепа от други членове на семейството',
    'suggestions.parent.goodFacts.2': 'Изграждам по-здрави семейни взаимоотношения',
    'suggestions.parent.lessons.0': 'Родителите са хора и правят грешки',
    'suggestions.parent.lessons.1': 'Мога да ги обичам, докато поставям граници',
    'suggestions.parent.lessons.2': 'Семейните взаимоотношения могат да се развиват и изцеляват',
    'suggestions.mother.hardTruths.0': 'Майка ми не беше там, когато се нуждаех от нея',
    'suggestions.mother.hardTruths.1': 'Усетих се осъден и неразбран от майка ми',
    'suggestions.mother.hardTruths.2': 'Връзката ни беше по-сложна, отколкото исках',
    'suggestions.mother.goodFacts.0': 'Научих се да приемам нейните ограничения',
    'suggestions.mother.goodFacts.1': 'Намерих майчинска подкрепа от други жени',
    'suggestions.mother.goodFacts.2': 'Изграждам връзка на собствените си условия',
    'suggestions.mother.lessons.0': 'Майките са хора, не са перфектни',
    'suggestions.mother.lessons.1': 'Мога да я обичам, докато се защитавам',
    'suggestions.mother.lessons.2': 'Изцелението на майка-дъщеря връзките отнема време',
    'suggestions.father.hardTruths.0': 'Баща ми не беше наличен, когато се нуждаех от него',
    'suggestions.father.hardTruths.1': 'Усетих се отхвърлен и необичан от баща ми',
    'suggestions.father.hardTruths.2': 'Връзката ни беше далечна и студена',
    'suggestions.father.goodFacts.0': 'Научих се да намеря бащинска подкрепа другаде',
    'suggestions.father.goodFacts.1': 'Намерих мъжки ментори, които ме подкрепиха',
    'suggestions.father.goodFacts.2': 'Изцелявам от бащини рани',
    'suggestions.father.lessons.0': 'Бащите са хора и имат ограничения',
    'suggestions.father.lessons.1': 'Мога да се изцеля без неговото одобрение',
    'suggestions.father.lessons.2': 'Заслужавам любов и подкрепа, с него или без него',
    'suggestions.sibling.hardTruths.0': 'Брат/сестра ми и аз се отдалечихме',
    'suggestions.sibling.hardTruths.1': 'Имахме конфликти, които никога не се разрешиха',
    'suggestions.sibling.hardTruths.2': 'Братската връзка, която исках, никога не съществуваше',
    'suggestions.sibling.goodFacts.0': 'Научих, че семейните връзки не са автоматични',
    'suggestions.sibling.goodFacts.1': 'Намерих избрано семейство, което ме подкрепя',
    'suggestions.sibling.goodFacts.2': 'Изграждам взаимоотношения, които имат значение',
    'suggestions.sibling.lessons.0': 'Кръвта не гарантира близост',
    'suggestions.sibling.lessons.1': 'Мога да избера кого считам за семейство',
    'suggestions.sibling.lessons.2': 'Здравите взаимоотношения изискват усилия от двете страни',
    'suggestions.child.hardTruths.0': 'Детето ми и аз се борехме да се свържем',
    'suggestions.child.hardTruths.1': 'Усетих се, че се провалям като родител',
    'suggestions.child.hardTruths.2': 'Родителството разкри моите собствени неразрешени проблеми',
    'suggestions.child.goodFacts.0': 'Уча се и раста като родител',
    'suggestions.child.goodFacts.1': 'Прекъсвам поколенчески модели',
    'suggestions.child.goodFacts.2': 'Ангажиран съм да бъда по-добър родител',
    'suggestions.child.lessons.0': 'Родителството е пътуване, не дестинация',
    'suggestions.child.lessons.1': 'Мога да се изцеля, докато родителствам',
    'suggestions.child.lessons.2': 'Любовта и усилията имат значение повече от перфектността',
    'suggestions.reunion.hardTruths.0': 'Семейните събирания подчертаха нашата дисфункция',
    'suggestions.reunion.hardTruths.1': 'Усетих се като чужденец на семейни събирания',
    'suggestions.reunion.hardTruths.2': 'Събиранията ми напомняха какво загубихме',
    'suggestions.reunion.goodFacts.0': 'Научих се да поставям граници на семейни събития',
    'suggestions.reunion.goodFacts.1': 'Намерих членове на семейството, които наистина се грижат',
    'suggestions.reunion.goodFacts.2': 'Изграждам по-здрави семейни връзки',
    'suggestions.reunion.lessons.0': 'Семейните събирания могат да бъдат навигирани с граници',
    'suggestions.reunion.lessons.1': 'Мога да избера кои семейни събития да посетя',
    'suggestions.reunion.lessons.2': 'Избраното семейство може да бъде по-подкрепящо от кръвното',
    'suggestions.bestfriend.hardTruths.0': 'Най-добрият ми приятел предаде доверието ми',
    'suggestions.bestfriend.hardTruths.1': 'Отдалечихме се и загубихме връзката си',
    'suggestions.bestfriend.hardTruths.2': 'Приятелството, което мислех, че е завинаги, приключи',
    'suggestions.bestfriend.goodFacts.0': 'Научих как изглежда истинското приятелство',
    'suggestions.bestfriend.goodFacts.1': 'Намерих нови приятели, които ме ценят',
    'suggestions.bestfriend.goodFacts.2': 'Изграждам по-дълбоки, по-здрави приятелства',
    'suggestions.bestfriend.lessons.0': 'Приятелствата могат да приключат, и това е нормално',
    'suggestions.bestfriend.lessons.1': 'Заслужавам приятели, които са лоялни и подкрепящи',
    'suggestions.bestfriend.lessons.2': 'Истинското приятелство изисква взаимни усилия',
    'suggestions.hangout.hardTruths.0': 'Излизането стана неудобно и наложено',
    'suggestions.hangout.hardTruths.1': 'Усетих се изключен от приятелски групи',
    'suggestions.hangout.hardTruths.2': 'Социалните събирания подчертаха нашето разстояние',
    'suggestions.hangout.goodFacts.0': 'Научих се да се наслаждавам на собствената си компания',
    'suggestions.hangout.goodFacts.1': 'Намерих приятели, които наистина искат да прекарват време с мен',
    'suggestions.hangout.goodFacts.2': 'Изграждам социални връзки, които се усещат естествени',
    'suggestions.hangout.lessons.0': 'Качеството има значение повече от количеството в приятелствата',
    'suggestions.hangout.lessons.1': 'Заслужавам приятели, които искат да излизат',
    'suggestions.hangout.lessons.2': 'Социалното време трябва да се усеща добре, а не наложено',
    'suggestions.sport.hardTruths.0': 'Изоставих спортове, които веднъж обичах',
    'suggestions.sport.hardTruths.1': 'Спортовете станаха източник на стрес, а не на радост',
    'suggestions.sport.hardTruths.2': 'Усетих се неадекватен в сравнение с другите',
    'suggestions.sport.goodFacts.0': 'Преоткривам радостта от движението',
    'suggestions.sport.goodFacts.1': 'Спортовете са за забавление и здраве, а не за конкуренция',
    'suggestions.sport.goodFacts.2': 'Намирам дейности, които наистина харесвам',
    'suggestions.sport.lessons.0': 'Спортовете трябва да носят радост, а не стрес',
    'suggestions.sport.lessons.1': 'Мога да се наслаждавам на спортове на собственото си ниво',
    'suggestions.sport.lessons.2': 'Физическата активност е за да се чувстваш добре, а не да бъдеш най-добрият',
    'suggestions.art.hardTruths.0': 'Спрях да създавам изкуство, защото се чувствах неадекватен',
    'suggestions.art.hardTruths.1': 'Изкуството стана източник на натиск, а не на изразяване',
    'suggestions.art.hardTruths.2': 'Сравнявах изкуството си с това на другите и се чувствах по-низш',
    'suggestions.art.goodFacts.0': 'Преоткривам радостта от създаването',
    'suggestions.art.goodFacts.1': 'Изкуството е за изразяване, а не за перфектност',
    'suggestions.art.goodFacts.2': 'Създавам за себе си, а не за одобрение',
    'suggestions.art.lessons.0': 'Изкуството е лично изразяване, а не конкуренция',
    'suggestions.art.lessons.1': 'Мога да създавам без осъждане',
    'suggestions.art.lessons.2': 'Процесът е по-важен от продукта',
    'suggestions.cooking.hardTruths.0': 'Готвенето стана задача, а не радост',
    'suggestions.cooking.hardTruths.1': 'Спрях да готвя, защото се чувствах неоценен',
    'suggestions.cooking.hardTruths.2': 'Готвенето за други се усещаше едностранно',
    'suggestions.cooking.goodFacts.0': 'Преоткривам радостта от готвенето за себе си',
    'suggestions.cooking.goodFacts.1': 'Готвенето е акт на самообгрижаване',
    'suggestions.cooking.goodFacts.2': 'Изследвам нови рецепти и вкусове',
    'suggestions.cooking.lessons.0': 'Готвенето трябва да носи радост, а не стрес',
    'suggestions.cooking.lessons.1': 'Мога да готвя за себе си и да се наслаждавам',
    'suggestions.cooking.lessons.2': 'Храната е за хранене и удоволствие',
    'suggestions.reading.hardTruths.0': 'Спрях да чета, защото се чувствах твърде зает',
    'suggestions.reading.hardTruths.1': 'Четенето стана източник на вина, а не на бягство',
    'suggestions.reading.hardTruths.2': 'Загубих радостта да се губя в книги',
    'suggestions.reading.goodFacts.0': 'Преоткривам удоволствието от четенето',
    'suggestions.reading.goodFacts.1': 'Четенето е форма на самообгрижаване и бягство',
    'suggestions.reading.goodFacts.2': 'Намирам книги, които ме вдъхновяват и изцеляват',
    'suggestions.reading.lessons.0': 'Четенето е подарък, който мога да си дам',
    'suggestions.reading.lessons.1': 'Книгите могат да бъдат изцеляващи и трансформиращи',
    'suggestions.reading.lessons.2': 'Времето за четене е време добре прекарано',
    'suggestions.writing.hardTruths.0': 'Спрях да пиша, защото се чувствах недостоен',
    'suggestions.writing.hardTruths.1': 'Писането стана източник на самокритика',
    'suggestions.writing.hardTruths.2': 'Сравнявах писането си с това на другите и се отказах',
    'suggestions.writing.goodFacts.0': 'Преоткривам силата на писането',
    'suggestions.writing.goodFacts.1': 'Писането е изцеляващо и терапевтично',
    'suggestions.writing.goodFacts.2': 'Пиша за себе си, а не за одобрение',
    'suggestions.writing.lessons.0': 'Писането е лично изразяване, а не конкуренция',
    'suggestions.writing.lessons.1': 'Мога да пиша без осъждане',
    'suggestions.writing.lessons.2': 'Думите ми имат стойност, независимо от това кой ги чете',
    'suggestions.dance.hardTruths.0': 'Спрях да танцувам, защото се чувствах самосъзнателен',
    'suggestions.dance.hardTruths.1': 'Танцът стана източник на срам',
    'suggestions.dance.hardTruths.2': 'Загубих свободата на движението, която веднъж имах',
    'suggestions.dance.goodFacts.0': 'Преоткривам радостта от движението',
    'suggestions.dance.goodFacts.1': 'Танцът е за изразяване, а не за перфектност',
    'suggestions.dance.goodFacts.2': 'Танцувам за себе си, а не за публика',
    'suggestions.dance.lessons.0': 'Танцът е за свобода и изразяване',
    'suggestions.dance.lessons.1': 'Мога да танцувам без осъждане',
    'suggestions.dance.lessons.2': 'Движението е изцеляващо и освобождаващо',
    'suggestions.garden.hardTruths.0': 'Градината ми умря, защото я пренебрегвах',
    'suggestions.garden.hardTruths.1': 'Градинарството стана източник на провал',
    'suggestions.garden.hardTruths.2': 'Усетих се неадекватен като градинар',
    'suggestions.garden.goodFacts.0': 'Научавам, че градините могат да бъдат презасадени',
    'suggestions.garden.goodFacts.1': 'Градинарството учи на търпение и растеж',
    'suggestions.garden.goodFacts.2': 'Започвам отново с нови растения',
    'suggestions.garden.lessons.0': 'Градините могат да бъдат презасадени и обновени',
    'suggestions.garden.lessons.1': 'Растежът отнема време и търпение',
    'suggestions.garden.lessons.2': 'Всяко растение ме учи на нещо ново',
    'suggestions.airport.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.airport.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.airport.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.airport.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.airport.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.airport.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.anniversary.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.anniversary.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.anniversary.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.anniversary.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.anniversary.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.anniversary.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.apology.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.apology.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.apology.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.apology.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.apology.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.apology.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.art.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.art.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.art.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.art.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.art.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.art.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.autumn.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.autumn.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.autumn.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.autumn.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.autumn.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.autumn.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.beach.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.beach.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.beach.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.beach.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.beach.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.beach.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.bestfriend.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.bestfriend.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.bestfriend.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.bestfriend.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.bestfriend.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.bestfriend.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.birthday.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.birthday.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.birthday.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.birthday.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.birthday.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.birthday.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.boss.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.boss.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.boss.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.boss.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.boss.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.boss.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.breakfast.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.breakfast.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.breakfast.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.breakfast.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.breakfast.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.breakfast.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.breakup.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.breakup.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.breakup.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.breakup.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.breakup.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.breakup.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.call.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.call.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.call.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.call.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.call.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.call.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.car.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.car.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.car.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.car.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.car.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.car.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.cheat.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.cheat.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.cheat.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.cheat.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.cheat.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.cheat.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.child.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.child.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.child.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.child.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.child.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.child.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.christmas.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.christmas.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.christmas.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.christmas.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.christmas.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.christmas.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.coffee.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.coffee.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.coffee.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.coffee.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.coffee.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.coffee.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.colleague.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.colleague.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.colleague.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.colleague.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.colleague.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.colleague.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.concert.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.concert.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.concert.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.concert.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.concert.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.concert.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.cooking.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.cooking.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.cooking.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.cooking.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.cooking.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.cooking.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.cuddle.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.cuddle.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.cuddle.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.cuddle.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.cuddle.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.cuddle.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.dance.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.dance.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.dance.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.dance.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.dance.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.dance.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.date.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.date.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.date.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.date.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.date.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.date.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.default.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.default.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.default.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.default.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.default.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.default.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.dinner.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.dinner.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.dinner.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.dinner.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.dinner.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.dinner.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.divorce.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.divorce.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.divorce.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.divorce.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.divorce.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.divorce.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.dream.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.dream.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.dream.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.dream.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.dream.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.dream.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.email.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.email.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.email.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.email.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.email.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.email.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.engagement.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.engagement.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.engagement.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.engagement.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.engagement.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.engagement.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.family.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.family.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.family.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.family.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.family.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.family.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.father.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.father.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.father.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.father.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.father.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.father.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.fight.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.fight.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.fight.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.fight.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.fight.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.fight.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.fired.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.fired.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.fired.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.fired.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.fired.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.fired.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.first.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.first.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.first.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.first.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.first.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.first.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.friend.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.friend.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.friend.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.friend.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.friend.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.friend.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.game.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.game.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.game.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.game.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.game.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.game.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.garden.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.garden.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.garden.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.garden.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.garden.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.garden.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.gift.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.gift.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.gift.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.gift.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.gift.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.gift.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.goodbye.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.goodbye.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.goodbye.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.goodbye.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.goodbye.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.goodbye.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.graduation.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.graduation.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.graduation.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.graduation.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.graduation.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.graduation.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.gym.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.gym.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.gym.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.gym.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.gym.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.gym.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.hangout.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.hangout.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.hangout.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.hangout.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.hangout.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.hangout.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.holiday.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.holiday.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.holiday.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.holiday.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.holiday.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.holiday.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.home.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.home.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.home.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.home.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.home.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.home.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.hospital.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.hospital.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.hospital.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.hospital.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.hospital.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.hospital.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.hug.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.hug.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.hug.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.hug.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.hug.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.hug.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.illness.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.illness.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.illness.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.illness.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.illness.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.illness.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.interview.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.interview.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.interview.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.interview.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.interview.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.interview.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.kiss.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.kiss.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.kiss.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.kiss.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.kiss.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.kiss.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.lake.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.lake.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.lake.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.lake.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.lake.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.lake.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.last.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.last.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.last.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.last.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.last.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.last.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.laugh.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.laugh.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.laugh.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.laugh.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.laugh.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.laugh.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.lie.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.lie.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.lie.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.lie.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.lie.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.lie.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.love.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.love.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.love.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.love.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.love.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.love.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.meeting.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.meeting.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.meeting.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.meeting.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.meeting.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.meeting.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.money.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.money.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.money.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.money.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.money.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.money.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.morning.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.morning.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.morning.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.morning.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.morning.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.morning.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.mother.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.mother.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.mother.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.mother.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.mother.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.mother.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.mountain.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.mountain.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.mountain.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.mountain.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.mountain.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.mountain.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.move.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.move.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.move.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.move.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.move.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.move.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.movie.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.movie.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.movie.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.movie.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.movie.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.movie.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.music.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.music.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.music.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.music.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.music.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.music.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.night.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.night.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.night.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.night.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.night.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.night.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.office.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.office.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.office.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.office.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.office.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.office.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.parent.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.parent.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.parent.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.parent.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.parent.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.parent.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.park.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.park.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.park.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.park.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.park.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.park.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.party.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.party.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.party.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.party.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.party.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.party.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.pet.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.pet.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.pet.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.pet.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.pet.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.pet.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.photo.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.photo.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.photo.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.photo.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.photo.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.photo.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.project.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.project.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.project.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.project.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.project.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.project.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.promise.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.promise.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.promise.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.promise.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.promise.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.promise.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.promotion.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.promotion.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.promotion.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.promotion.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.promotion.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.promotion.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.proposal.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.proposal.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.proposal.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.proposal.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.proposal.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.proposal.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.rain.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.rain.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.rain.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.rain.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.rain.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.rain.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.reading.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.reading.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.reading.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.reading.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.reading.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.reading.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.restaurant.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.restaurant.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.restaurant.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.restaurant.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.restaurant.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.restaurant.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.reunion.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.reunion.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.reunion.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.reunion.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.reunion.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.reunion.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.ring.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.ring.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.ring.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.ring.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.ring.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.ring.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.sand.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.sand.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.sand.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.sand.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.sand.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.sand.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.school.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.school.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.school.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.school.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.school.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.school.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.shopping.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.shopping.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.shopping.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.shopping.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.shopping.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.shopping.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.sibling.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.sibling.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.sibling.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.sibling.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.sibling.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.sibling.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.snow.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.snow.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.snow.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.snow.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.snow.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.snow.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.sport.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.sport.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.sport.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.sport.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.sport.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.sport.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.spring.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.spring.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.spring.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.spring.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.spring.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.spring.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.storm.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.storm.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.storm.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.storm.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.storm.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.storm.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.summer.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.summer.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.summer.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.summer.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.summer.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.summer.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.sunrise.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.sunrise.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.sunrise.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.sunrise.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.sunrise.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.sunrise.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.sunset.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.sunset.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.sunset.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.sunset.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.sunset.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.sunset.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.text.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.text.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.text.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.text.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.text.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.text.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.together.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.together.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.together.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.together.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.together.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.together.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.travel.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.travel.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.travel.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.travel.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.travel.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.travel.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.trip.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.trip.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.trip.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.trip.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.trip.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.trip.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.trust.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.trust.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.trust.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.trust.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.trust.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.trust.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.vacation.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.vacation.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.vacation.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.vacation.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.vacation.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.vacation.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.video.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.video.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.video.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.video.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.video.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.video.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.walk.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.walk.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.walk.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.walk.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.walk.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.walk.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.wedding.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.wedding.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.wedding.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.wedding.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.wedding.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.wedding.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.weekend.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.weekend.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.weekend.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.weekend.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.weekend.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.weekend.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.winter.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.winter.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.winter.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.winter.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.winter.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.winter.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.work.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.work.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.work.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.work.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.work.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.work.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
    'suggestions.writing.hardTruths.3': 'Изправих се с предизвикателства, които разкриха по-дълбоки истини за тази ситуация',
    'suggestions.writing.hardTruths.4': 'Реалността беше по-трудна, отколкото исках да призная',
    'suggestions.writing.goodFacts.3': 'Открих сила, която не знаех, че имам',
    'suggestions.writing.goodFacts.4': 'Това преживяване ме научи на ценни уроци за себе си',
    'suggestions.writing.lessons.3': 'Растежът идва от изправянето срещу трудни истини',
    'suggestions.writing.lessons.4': 'По-силен и по-мъдър съм заради това преживяване',
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

