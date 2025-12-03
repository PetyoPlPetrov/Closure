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
  'insights.comparison.career.title': string;
  'insights.comparison.career.chartTitle': string;
  'insights.comparison.career.subtitle': string;
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
}

const translations: Record<Language, Translations> = {
  en: {
    // Tab labels
    'tab.home': 'Home',
    'tab.exProfiles': 'Ex Profiles',
    'tab.spheres': 'Spheres',
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
    'settings.devTools.generateData.success': 'Created {profiles} profiles and {jobs} jobs with {memories} total memories!\n\nAll data has been saved to local storage. Navigate to the Spheres tab to see your data.',
    'settings.devTools.generateData.error': 'Failed to generate fake data. Please try again.',
    'settings.devTools.clearData.title': 'Clear All App Data',
    'settings.devTools.clearData.message': 'Are you sure you want to delete ALL data from this app? This will remove:\n\n• All profiles/partners\n• All jobs\n• All memories\n• All family members\n• All avatar positions\n\nThis action cannot be undone.\n\nYour theme and language settings will be preserved.',
    'settings.devTools.clearData.deleteButton': 'Delete All Data',
    'settings.devTools.clearData.success': 'All app data has been deleted from local storage.\n\nThe app will now show 0% and no profiles/jobs/memories.\n\nPlease navigate away and back to the Spheres/Home tab to see the changes reflected in the UI.',
    'settings.devTools.clearData.error': 'Failed to clear app data. Please try again.',
    
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
    
    // Profile screens
    'profile.add': 'Add Profile',
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
    'spheres.title': 'Life Spheres',
    'spheres.relationships': 'Relationships',
    'spheres.career': 'Career',
    'spheres.family': 'Family',
    'spheres.friends': 'Friends',
    'spheres.hobbies': 'Hobbies',
    'spheres.item': 'item',
    'spheres.items': 'items',
    
    // Insights
    'insights.wheelOfLife.title': 'Insights',
    'insights.wheelOfLife.subtitle': 'Analyze your life balance across different spheres',
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
    'insights.comparison.relationships.sphereComparison.moreRelationshipTime': 'Relationships prevail in your life, with significantly more moments recorded compared to career. Your personal connections are a priority.',
    'insights.comparison.relationships.sphereComparison.moreCareerTime': 'Career prevails in your life, with significantly more moments recorded compared to relationships. Consider balancing your focus between work and personal connections.',
    'insights.comparison.relationships.sphereComparison.balancedTime': 'You have an approximately balanced work-life distribution between relationships and career.',
    'insights.comparison.relationships.sphereComparison.betterRelationshipQuality': 'Your relationships have significantly better quality (more sunny moments) compared to your career. Great job nurturing your connections!',
    'insights.comparison.relationships.sphereComparison.betterCareerQuality': 'Your career has significantly better quality (more sunny moments) compared to your relationships. Consider focusing more on building positive connections.',
    'insights.comparison.general.balance': 'Remember to strive for balance in life. No sphere should be left behind - nurturing all aspects of your life contributes to overall well-being.',
    'insights.comparison.career.title': 'Career Comparison',
    'insights.comparison.career.chartTitle': 'How Sunny and Cloudy Moments Change Across Jobs',
    'insights.comparison.career.subtitle': 'Overall amount of moments',
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
    'insights.comparison.family.insight.moreFamilyTime': 'You spend more time with family than on your career. Great balance!',
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
    'insights.comparison.friends.otherSpheres': 'Other Spheres',
    'insights.comparison.friends.insight.moreFriendsTime': 'You spend more time with friends than on average with other spheres. Great social balance!',
    'insights.comparison.friends.insight.moreOtherSpheresTime': 'You spend less time with friends compared to other spheres. Consider finding more time for friendships.',
    'insights.comparison.friends.insight.balancedTime': 'You have a well-balanced distribution of time between friends and other spheres.',
    'insights.comparison.friends.members.title': 'Time with Friends',
    'insights.comparison.friends.members.balanced': 'You have a well-balanced distribution of moments across all friends. Great friendship harmony!',
    'insights.comparison.friends.members.catchUp': 'Consider spending more time with',
    'insights.comparison.friends.members.andQuality': 'and their moments have lower quality',
    'insights.comparison.friends.members.qualityTime': 'Try spending more quality time with',
    'insights.comparison.friends.members.mostTime': 'You spend most of your friend moments with',
    'insights.comparison.hobbies.title': 'Hobbies Comparison',
    'insights.comparison.hobbies.subtitle': 'Overall amount of moments',
    'insights.comparison.hobbies.noData': 'No data available for comparison',
    'insights.comparison.hobbies.otherSpheres': 'Other Spheres',
    'insights.comparison.hobbies.insight.moreHobbiesTime': 'You spend more time on hobbies than on average with other spheres. Great personal development!',
    'insights.comparison.hobbies.insight.moreOtherSpheresTime': 'You spend less time on hobbies compared to other spheres. Consider finding more time for your interests.',
    'insights.comparison.hobbies.insight.balancedTime': 'You have a well-balanced distribution of time between hobbies and other spheres.',
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
    'subscription.feature.support': 'Priority support and updates',
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
  },
  bg: {
    // Tab labels
    'tab.home': 'Начало',
    'tab.exProfiles': 'Партньори',
    'tab.spheres': 'Сфери',
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
    'insights.comparison.relationships.sphereComparison.moreRelationshipTime': 'Връзките преобладават в живота ви, с значително повече записани моменти в сравнение с кариерата. Личните ви връзки са приоритет.',
    'insights.comparison.relationships.sphereComparison.moreCareerTime': 'Кариерата преобладава в живота ви, с значително повече записани моменти в сравнение с връзките. Помислете за балансиране на фокуса между работа и лични връзки.',
    'insights.comparison.relationships.sphereComparison.balancedTime': 'Имате приблизително балансирано разпределение на работа и личен живот между връзки и кариера.',
    'insights.comparison.relationships.sphereComparison.betterRelationshipQuality': 'Вашите връзки имат значително по-добро качество (повече слънчеви моменти) в сравнение с кариерата ви. Отлична работа в поддържането на връзките!',
    'insights.comparison.relationships.sphereComparison.betterCareerQuality': 'Вашата кариера има значително по-добро качество (повече слънчеви моменти) в сравнение с връзките ви. Помислете да се фокусирате повече върху изграждането на позитивни връзки.',
    'insights.comparison.general.balance': 'Не забравяйте да се стремите към баланс в живота. Никоя сфера не трябва да остане изоставена - грижата за всички аспекти на живота ви допринася за общото благополучие.',
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
    'insights.comparison.family.insight.moreFamilyTime': 'Отделяте повече време за семейството, отколкото за кариерата. Отличен баланс!',
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
    'insights.comparison.friends.otherSpheres': 'Други Сфери',
    'insights.comparison.friends.insight.moreFriendsTime': 'Отделяте повече време за приятели, отколкото средно за други сфери. Отличен социален баланс!',
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
    'insights.comparison.hobbies.otherSpheres': 'Други Сфери',
    'insights.comparison.hobbies.insight.moreHobbiesTime': 'Отделяте повече време за хобита, отколкото средно за други сфери. Отлично личностно развитие!',
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
    'subscription.feature.support': 'Приоритетна поддръжка и актуализации',
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

