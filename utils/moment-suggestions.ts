/**
 * Smart suggestions for moments (hard truths, good facts, lessons) based on memory titles
 * Provides contextual placeholders that match the content of memories
 */

export interface MomentSuggestions {
  hardTruths: string[];
  goodFacts: string[];
  lessons: string[];
}

/**
 * Keyword-based suggestions database
 * Each key represents words that might appear in a memory title
 */
const suggestionsByKeyword: Record<string, MomentSuggestions> = {
  // Birthday related
  birthday: {
    hardTruths: [
      "They didn't remember my birthday",
      "I was left alone on my special day",
      "The celebration felt forced and uncomfortable",
    ],
    goodFacts: [
      "I learned who really cares about me",
      "I can create my own joy without validation",
      "Some friends showed up when it mattered",
    ],
    lessons: [
      "Birthdays don't define my worth",
      "True friends show up without reminders",
      "I can celebrate myself first",
    ],
  },

  // Anniversary related
  anniversary: {
    hardTruths: [
      "They forgot our anniversary",
      "The day meant more to me than to them",
      "I felt alone even when we were together",
    ],
    goodFacts: [
      "I remember the good times we had",
      "I honored our history even if they didn't",
      "I learned what I truly value in relationships",
    ],
    lessons: [
      "Equal investment matters in relationships",
      "I deserve someone who remembers what's important",
      "Memory and effort show true care",
    ],
  },

  // Breakup related
  breakup: {
    hardTruths: [
      "The relationship was over long before we ended it",
      "I ignored the red flags for too long",
      "We wanted different things but neither admitted it",
    ],
    goodFacts: [
      "I finally found the courage to let go",
      "I'm free to find someone who truly values me",
      "I learned what I don't want in a partner",
    ],
    lessons: [
      "Staying for comfort isn't the same as love",
      "I deserve someone who fights for us",
      "Endings can be new beginnings",
    ],
  },

  // Wedding related
  wedding: {
    hardTruths: [
      "I felt invisible at their wedding",
      "Watching them move on was harder than expected",
      "I realized what we could have had",
    ],
    goodFacts: [
      "I showed strength by attending",
      "I can be happy for them despite my pain",
      "I handled it with grace and dignity",
    ],
    lessons: [
      "Their happiness doesn't diminish mine",
      "Closure comes from within, not from events",
      "I'm capable of moving forward",
    ],
  },

  // Holiday related
  holiday: {
    hardTruths: [
      "The holidays felt empty without them",
      "Family gatherings highlighted what I lost",
      "I felt like an outsider in familiar places",
    ],
    goodFacts: [
      "I created new traditions for myself",
      "I found joy in unexpected places",
      "Some family members really showed up for me",
    ],
    lessons: [
      "Holidays can be redefined and reclaimed",
      "Traditions evolve and that's okay",
      "I can create joy independently",
    ],
  },

  // Christmas related
  christmas: {
    hardTruths: [
      "Christmas reminded me of what I lost",
      "The empty seat at the table hurt more than expected",
      "Everyone else seemed happy while I struggled",
    ],
    goodFacts: [
      "I survived the hardest holiday season",
      "I found moments of peace and gratitude",
      "I learned I'm stronger than I thought",
    ],
    lessons: [
      "Grief and joy can coexist",
      "It's okay to feel differently than others",
      "Next year will be easier",
    ],
  },

  // Vacation/trip related
  vacation: {
    hardTruths: [
      "The trip we planned together never happened",
      "I saw them vacation with someone new",
      "Our travel dreams died with the relationship",
    ],
    goodFacts: [
      "I took that trip solo and loved it",
      "I discovered new places on my own terms",
      "I proved I don't need a partner to explore",
    ],
    lessons: [
      "Independence can be liberating",
      "Solo adventures are just as meaningful",
      "I can create memories without them",
    ],
  },

  // Trip related
  trip: {
    hardTruths: [
      "Our planned trips together never materialized",
      "They took trips without me that we'd dreamed of",
      "Traveling together revealed our incompatibility",
    ],
    goodFacts: [
      "I'm planning trips that excite me",
      "I can travel anywhere I want now",
      "Solo trips taught me independence",
    ],
    lessons: [
      "Adventure doesn't require a partner",
      "I can explore the world on my own terms",
      "Travel plans should align with my desires, not compromise",
    ],
  },

  // Walk related
  walk: {
    hardTruths: [
      "Our walks together became silent and uncomfortable",
      "They never wanted to walk with me",
      "Walking alone reminded me of what I lost",
    ],
    goodFacts: [
      "Walking alone is peaceful and meditative",
      "I can walk wherever I want, at my own pace",
      "Walks help me process and heal",
    ],
    lessons: [
      "Solitude in nature is healing",
      "Moving forward literally helps me move forward emotionally",
      "I can find peace in simple moments alone",
    ],
  },

  // Mountain related
  mountain: {
    hardTruths: [
      "The mountains we planned to climb together remain unclimbed",
      "They reached peaks without me",
      "Mountain adventures we dreamed of never happened",
    ],
    goodFacts: [
      "I'm conquering my own mountains now",
      "Mountain views remind me of life's bigger picture",
      "Climbing teaches me I can overcome anything",
    ],
    lessons: [
      "I can reach peaks on my own",
      "The journey up is just as important as the view",
      "Every summit proves my strength",
    ],
  },

  // Lake related
  lake: {
    hardTruths: [
      "Lakeside memories we shared are now bittersweet",
      "They enjoyed the water without me",
      "Our peaceful moments by the lake are gone",
    ],
    goodFacts: [
      "Lakes still bring me peace and tranquility",
      "Water has a calming, healing effect",
      "I can find serenity by the water alone",
    ],
    lessons: [
      "Nature's peace belongs to everyone",
      "Still waters reflect my inner calm",
      "I can reclaim peaceful places for myself",
    ],
  },

  // Sand/beach related
  sand: {
    hardTruths: [
      "Walking on sand together felt like walking on broken promises",
      "The beach reminds me of plans that washed away",
      "Our footprints in the sand were temporary, like our relationship",
    ],
    goodFacts: [
      "Sand between my toes still feels grounding",
      "Beaches are places of renewal and letting go",
      "Every wave washes away a little more pain",
    ],
    lessons: [
      "Like sand, I can reshape myself",
      "The tide always comes in fresh and new",
      "Beach memories can be reclaimed for new beginnings",
    ],
  },

  // Work/job related
  work: {
    hardTruths: [
      "My career stress contributed to our problems",
      "I prioritized work over the relationship",
      "They never understood my professional ambitions",
    ],
    goodFacts: [
      "I achieved professional growth during hard times",
      "Work provided stability when life was chaotic",
      "I proved I can succeed independently",
    ],
    lessons: [
      "Balance between work and life is crucial",
      "A partner should support my ambitions",
      "Success means nothing without fulfillment",
    ],
  },

  // Family related
  family: {
    hardTruths: [
      "My family never really accepted them",
      "Family events became awkward and painful",
      "I lost some family connections in the breakup",
    ],
    goodFacts: [
      "My family supported me through it all",
      "I strengthened bonds with siblings",
      "Family helped me see my worth",
    ],
    lessons: [
      "Family wisdom often sees what we can't",
      "Blood is thicker than broken promises",
      "True family shows up in crisis",
    ],
  },

  // Moving/relocation related
  move: {
    hardTruths: [
      "They chose a place over our relationship",
      "The distance revealed our true commitment",
      "I sacrificed my location for nothing",
    ],
    goodFacts: [
      "I found a new home and new beginnings",
      "The move gave me space to heal",
      "I built a life that's truly mine",
    ],
    lessons: [
      "Home is where I make it, not where they are",
      "Geography can't fix relationship problems",
      "I'm capable of starting over anywhere",
    ],
  },

  // Fight/argument related
  fight: {
    hardTruths: [
      "We fought about the same things repeatedly",
      "The arguments became more important than solutions",
      "I said things I can't take back",
    ],
    goodFacts: [
      "I learned to communicate my needs clearly",
      "I discovered my boundaries through conflict",
      "Some fights revealed incompatibilities early",
    ],
    lessons: [
      "How we fight matters more than what we fight about",
      "Respect must remain even in disagreement",
      "Some patterns can't be changed",
    ],
  },

  // Trust/cheating related
  trust: {
    hardTruths: [
      "The trust was broken and never fully restored",
      "I stayed despite knowing the truth",
      "My intuition was right all along",
    ],
    goodFacts: [
      "I'm learning to trust myself again",
      "I didn't compromise my values in the end",
      "I chose self-respect over comfort",
    ],
    lessons: [
      "Trust is the foundation of everything",
      "Once broken, it's rarely the same",
      "I must trust myself first",
    ],
  },

  cheat: {
    hardTruths: [
      "They chose someone else while with me",
      "I was never enough for them",
      "The betrayal cut deeper than I admitted",
    ],
    goodFacts: [
      "I discovered my strength through betrayal",
      "I learned I deserve complete loyalty",
      "I found self-worth beyond their validation",
    ],
    lessons: [
      "Cheating is about their character, not my worth",
      "I deserve unwavering faithfulness",
      "Betrayal teaches who people really are",
    ],
  },

  // Lie/dishonesty related
  lie: {
    hardTruths: [
      "They lied about important things",
      "I accepted half-truths for too long",
      "The foundation was built on deception",
    ],
    goodFacts: [
      "I eventually saw through the lies",
      "I learned to recognize dishonesty",
      "I value authenticity more than ever",
    ],
    lessons: [
      "Honesty is non-negotiable",
      "Small lies reveal bigger character flaws",
      "Truth is the only foundation for love",
    ],
  },

  // Friends related
  friend: {
    hardTruths: [
      "Some friends took their side",
      "I lost mutual friends in the breakup",
      "Friends saw problems I couldn't see",
    ],
    goodFacts: [
      "True friends stayed by my side",
      "I made new, deeper friendships",
      "Friends helped me rediscover myself",
    ],
    lessons: [
      "Real friends are revealed in hardship",
      "Quality matters more than quantity",
      "Friendship is a choice, not an obligation",
    ],
  },

  // Pet related
  pet: {
    hardTruths: [
      "We had to decide who keeps our pet",
      "The pet misses them too",
      "Shared pet custody is heartbreaking",
    ],
    goodFacts: [
      "Our pet gives unconditional love",
      "I have a loyal companion through this",
      "The pet brought us joy even in hard times",
    ],
    lessons: [
      "Pets love us through everything",
      "Simple companionship can heal",
      "Unconditional love still exists",
    ],
  },

  // Home/house related
  home: {
    hardTruths: [
      "The home we built together is just a place now",
      "Every corner holds painful memories",
      "I had to leave the home I loved",
    ],
    goodFacts: [
      "I'm creating a new space that's truly mine",
      "The house was never what made it home",
      "I can start fresh without those memories",
    ],
    lessons: [
      "Home is a feeling, not a place",
      "I can create sanctuary anywhere",
      "Spaces can be reclaimed and redefined",
    ],
  },

  // Money/financial related
  money: {
    hardTruths: [
      "Financial stress revealed our incompatibility",
      "They valued money over our relationship",
      "I was used financially",
    ],
    goodFacts: [
      "I'm financially independent now",
      "I learned to manage money on my own",
      "Financial freedom is empowering",
    ],
    lessons: [
      "Financial values must align in relationships",
      "Independence is invaluable",
      "Money reveals character",
    ],
  },

  // Apology related
  apology: {
    hardTruths: [
      "The apology came too late",
      "Words without actions are meaningless",
      "I deserved an apology that never came",
    ],
    goodFacts: [
      "I learned to apologize to myself",
      "I don't need their apology to heal",
      "I can forgive without accepting excuses",
    ],
    lessons: [
      "Closure doesn't require their participation",
      "Actions speak louder than apologies",
      "I can move on without their sorry",
    ],
  },

  // Promise/commitment related
  promise: {
    hardTruths: [
      "Promises were broken without a second thought",
      "Words were cheap, commitment was cheaper",
      "I believed promises I shouldn't have",
    ],
    goodFacts: [
      "I learned the value of my own word",
      "I keep promises to myself now",
      "I recognize empty promises quickly now",
    ],
    lessons: [
      "Watch actions, not words",
      "Keep promises to yourself first",
      "Commitment shows in behavior, not speech",
    ],
  },

  // Graduation related
  graduation: {
    hardTruths: [
      "They weren't there for my big achievement",
      "I celebrated alone what should have been shared",
      "Their absence tarnished a moment I worked hard for",
    ],
    goodFacts: [
      "I accomplished this milestone on my own",
      "My achievement doesn't depend on their presence",
      "I proved I can succeed independently",
    ],
    lessons: [
      "I celebrate my wins with or without them",
      "Achievements belong to me alone",
      "Success is sweeter when it's truly mine",
    ],
  },

  // Promotion/job success related
  promotion: {
    hardTruths: [
      "They didn't celebrate my professional success",
      "My achievements meant nothing to them",
      "I worked hard but felt unsupported",
    ],
    goodFacts: [
      "I earned this through my own effort",
      "My career growth shows my resilience",
      "I'm building a life that's truly mine",
    ],
    lessons: [
      "I don't need their validation to succeed",
      "Professional growth happens with or without them",
      "My worth isn't measured by their acknowledgment",
    ],
  },

  // Illness/health related
  illness: {
    hardTruths: [
      "They weren't there when I was sick",
      "I felt alone during my most vulnerable moments",
      "My health struggles didn't matter to them",
    ],
    goodFacts: [
      "I learned to care for myself",
      "I found strength I didn't know I had",
      "I survived without their support",
    ],
    lessons: [
      "I must prioritize my own health",
      "Self-care isn't selfish, it's necessary",
      "I can rely on myself in sickness",
    ],
  },

  // Hospital/medical related
  hospital: {
    hardTruths: [
      "They never visited me in the hospital",
      "I faced my fear alone when I needed support",
      "Medical emergencies revealed their true priorities",
    ],
    goodFacts: [
      "I handled medical challenges with courage",
      "I learned I'm stronger than I thought",
      "I have people who truly care about my health",
    ],
    lessons: [
      "True care shows up in crisis",
      "Health emergencies reveal character",
      "I deserve support in my hardest moments",
    ],
  },

  // Concert/music event related
  concert: {
    hardTruths: [
      "We planned to go together but they went with someone else",
      "I attended alone, remembering our plans",
      "The music reminded me of what we shared",
    ],
    goodFacts: [
      "I enjoyed the music on my own terms",
      "I discovered I can have fun alone",
      "Music still brings me joy without them",
    ],
    lessons: [
      "I don't need a date to enjoy life",
      "Shared interests don't require shared experiences",
      "I can create new memories alone",
    ],
  },

  // Restaurant/dinner related
  restaurant: {
    hardTruths: [
      "Our favorite restaurant holds too many memories",
      "I ate alone at places we discovered together",
      "Every meal reminded me of our conversations",
    ],
    goodFacts: [
      "I can enjoy dining solo now",
      "I'm discovering new favorite places",
      "Food still brings me comfort and joy",
    ],
    lessons: [
      "Places can be reclaimed and redefined",
      "I can find joy in simple pleasures alone",
      "New memories can overwrite old ones",
    ],
  },

  // Date related
  date: {
    hardTruths: [
      "They canceled our plans last minute repeatedly",
      "Our dates became obligations, not joys",
      "I put more effort into dates than they did",
    ],
    goodFacts: [
      "I learned what makes a good date",
      "I know what I want in future dates",
      "I'm ready for someone who values our time together",
    ],
    lessons: [
      "Dates should be wanted, not forced",
      "Effort in planning shows care",
      "I deserve someone excited to spend time with me",
    ],
  },

  // Gift related
  gift: {
    hardTruths: [
      "They never put thought into gifts for me",
      "My gifts to them were more meaningful than theirs to me",
      "Gift-giving became one-sided",
    ],
    goodFacts: [
      "I learned the joy of giving without expectation",
      "I appreciate people who remember special occasions",
      "I can give myself meaningful gifts now",
    ],
    lessons: [
      "Gifts reflect thoughtfulness and care",
      "I deserve someone who puts effort into making me happy",
      "Material things matter less than the gesture",
    ],
  },

  // Text/message related
  text: {
    hardTruths: [
      "They left my messages on read for days",
      "One-word replies showed their disinterest",
      "I always initiated conversations",
    ],
    goodFacts: [
      "I stopped waiting for replies that never came",
      "I learned my worth isn't measured by response time",
      "I found people who actually want to talk to me",
    ],
    lessons: [
      "Communication should be two-way",
      "If they wanted to, they would",
      "I deserve enthusiastic conversation partners",
    ],
  },

  // Phone call related
  call: {
    hardTruths: [
      "They never answered when I needed them",
      "Phone calls became one-sided monologues",
      "I stopped calling because they never called back",
    ],
    goodFacts: [
      "I found people who answer when I call",
      "I learned to rely on myself more",
      "I don't wait for calls that won't come",
    ],
    lessons: [
      "Availability matters in relationships",
      "I deserve people who want to hear from me",
      "Phone calls should be wanted, not avoided",
    ],
  },

  // Party/social event related
  party: {
    hardTruths: [
      "They ignored me at parties we attended together",
      "I felt like a stranger at our own events",
      "They socialized while I felt invisible",
    ],
    goodFacts: [
      "I learned to enjoy parties independently",
      "I can have fun without their validation",
      "I discovered I'm actually good at socializing alone",
    ],
    lessons: [
      "Partners should make each other feel included",
      "I can thrive in social situations independently",
      "I deserve someone who wants me by their side",
    ],
  },

  // Coffee/cafe related
  coffee: {
    hardTruths: [
      "Our coffee dates became awkward silences",
      "They always seemed distracted during our conversations",
      "I noticed they'd rather be anywhere else",
    ],
    goodFacts: [
      "I learned to enjoy coffee alone",
      "Cafes became my peaceful space",
      "I can have meaningful conversations with myself",
    ],
    lessons: [
      "Simple moments should feel comfortable",
      "Presence matters more than the place",
      "I deserve engaging conversations over coffee",
    ],
  },

  // School/education related
  school: {
    hardTruths: [
      "They didn't support my educational goals",
      "My studies became a source of conflict",
      "They saw my ambitions as a threat",
    ],
    goodFacts: [
      "I pursued education for myself",
      "Learning gives me purpose and growth",
      "Education is an investment in my future",
    ],
    lessons: [
      "A partner should support my growth",
      "Education is non-negotiable",
      "I'm building a better future for myself",
    ],
  },

  // Gym/exercise related
  gym: {
    hardTruths: [
      "They criticized my fitness goals",
      "Working out became something I hid from them",
      "They made me feel self-conscious about my body",
    ],
    goodFacts: [
      "I exercise for my mental and physical health",
      "The gym became my sanctuary",
      "I'm building strength inside and out",
    ],
    lessons: [
      "Self-improvement should be encouraged",
      "My body goals are my own",
      "A partner should lift me up, not bring me down",
    ],
  },

  // Music/song related
  music: {
    hardTruths: [
      "Our songs became too painful to hear",
      "Music we discovered together now triggers sadness",
      "They ruined artists I once loved",
    ],
    goodFacts: [
      "I'm discovering new music that's just mine",
      "Music still moves me deeply",
      "I can find new meaning in old songs",
    ],
    lessons: [
      "Music can be reclaimed and redefined",
      "Art belongs to me, not our memories",
      "New songs can create new associations",
    ],
  },

  // Movie/film related
  movie: {
    hardTruths: [
      "Movie nights became lonely experiences",
      "They'd rather watch alone than with me",
      "Our shared interests didn't translate to quality time",
    ],
    goodFacts: [
      "I can enjoy films on my own",
      "Movie theaters became my escape",
      "I'm discovering new favorites independently",
    ],
    lessons: [
      "Shared interests need shared effort",
      "I can find joy in solo entertainment",
      "Quality time matters more than the activity",
    ],
  },

  // Photo/picture related
  photo: {
    hardTruths: [
      "Looking at old photos brings more pain than joy",
      "They deleted our memories without hesitation",
      "Pictures revealed truths I couldn't see before",
    ],
    goodFacts: [
      "I'm taking new photos of my life now",
      "Photos document my growth and healing",
      "I can look back with clarity instead of pain",
    ],
    lessons: [
      "Photos capture moments, not permanence",
      "I'm creating new memories worth photographing",
      "The past is over, but I have a future",
    ],
  },

  // Travel/journey related
  travel: {
    hardTruths: [
      "The trip we dreamed of will never happen",
      "Travel plans died with the relationship",
      "They went on adventures I was excluded from",
    ],
    goodFacts: [
      "I'm planning trips just for me",
      "Traveling solo is liberating",
      "The world is still full of places to discover",
    ],
    lessons: [
      "I can explore the world alone",
      "Adventure doesn't require a partner",
      "Travel heals and expands perspectives",
    ],
  },

  // Airport related
  airport: {
    hardTruths: [
      "They never came to pick me up",
      "Airport goodbyes revealed their true feelings",
      "Traveling to see them was always one-way effort",
    ],
    goodFacts: [
      "I learned to navigate airports independently",
      "Airports symbolize my freedom now",
      "I can travel wherever I want, whenever I want",
    ],
    lessons: [
      "Effort should be mutual in long-distance",
      "I'm free to go anywhere without permission",
      "Travel represents my independence",
    ],
  },

  // Beach/water related
  beach: {
    hardTruths: [
      "Our beach memories are now bittersweet",
      "The ocean reminds me of promises that washed away",
      "They loved the beach more than they loved me",
    ],
    goodFacts: [
      "The ocean still brings me peace",
      "Beaches are places of renewal and healing",
      "Water has a way of washing away pain",
    ],
    lessons: [
      "Nature heals regardless of who's beside me",
      "The ocean's vastness puts things in perspective",
      "I can find peace in the same places again",
    ],
  },

  // Park/nature related
  park: {
    hardTruths: [
      "Walking in parks reminded me of what we lost",
      "Nature felt empty without them",
      "Our favorite spots became places to avoid",
    ],
    goodFacts: [
      "Nature still brings me peace and clarity",
      "Parks are places of healing and reflection",
      "I'm finding new favorite spots",
    ],
    lessons: [
      "Nature belongs to everyone",
      "The outdoors can be reclaimed for myself",
      "Peace comes from within, not from company",
    ],
  },

  // Shopping related
  shopping: {
    hardTruths: [
      "Shopping together became a chore for them",
      "They criticized my choices and preferences",
      "Our styles reflected our incompatibility",
    ],
    goodFacts: [
      "I'm developing my own unique style",
      "Shopping is now a form of self-expression",
      "I can buy what makes me happy without judgment",
    ],
    lessons: [
      "Personal style is about self-expression",
      "I don't need approval for my choices",
      "Shopping alone can be empowering",
    ],
  },

  // Car/driving related
  car: {
    hardTruths: [
      "They never wanted to drive to see me",
      "Car rides became silent and tense",
      "The car we shared now holds painful memories",
    ],
    goodFacts: [
      "I have freedom to go anywhere",
      "Driving alone is peaceful and liberating",
      "The road ahead is mine to choose",
    ],
    lessons: [
      "Independence means going my own way",
      "I control where I'm headed",
      "The journey matters more than who's in the passenger seat",
    ],
  },

  // Game/gaming related
  game: {
    hardTruths: [
      "They never wanted to play with me",
      "Gaming became a way to avoid me",
      "Our interests diverged completely",
    ],
    goodFacts: [
      "I enjoy games on my own terms",
      "Gaming is a healthy escape and fun",
      "I can find communities that share my interests",
    ],
    lessons: [
      "Hobbies don't require partner participation",
      "I can enjoy my interests independently",
      "Shared interests aren't necessary for compatibility",
    ],
  },

  // Generic/fallback suggestions
  default: {
    hardTruths: [
      "I ignored the signs that were always there",
      "I stayed longer than I should have",
      "I compromised too much of myself",
    ],
    goodFacts: [
      "I learned what I truly need in a relationship",
      "I grew stronger through this experience",
      "I'm one step closer to the right person",
    ],
    lessons: [
      "Growth comes from the hardest experiences",
      "I deserve better than I accepted",
      "Healing is a journey, not a destination",
    ],
  },
};

/**
 * Bulgarian translations for the suggestions
 */
const suggestionsByKeywordBg: Record<string, MomentSuggestions> = {
  // Birthday related
  birthday: {
    hardTruths: [
      "Не си спомниха рожденния ми ден",
      "Останах сам в специалния си ден",
      "Празненството се усеща наложено и неудобно",
    ],
    goodFacts: [
      "Научих кой наистина се грижи за мен",
      "Мога да създам собствена радост без одобрение",
      "Някои приятели се появиха, когато беше важно",
    ],
    lessons: [
      "Рождените дни не определят стойността ми",
      "Истинските приятели се появяват без напомняния",
      "Мога да празнувам себе си на първо място",
    ],
  },

  // Anniversary related
  anniversary: {
    hardTruths: [
      "Забравиха годишнината ни",
      "Денят значеше повече за мен, отколкото за тях",
      "Усетих се сам, дори когато бяхме заедно",
    ],
    goodFacts: [
      "Помня хубавите времена, които имахме",
      "Почетох историята ни, дори ако те не го направиха",
      "Научих какво наистина ценя във взаимоотношенията",
    ],
    lessons: [
      "Равната инвестиция има значение във взаимоотношенията",
      "Заслужавам някой, който помни важното",
      "Паметта и усилията показват истинска грижа",
    ],
  },

  // Breakup related
  breakup: {
    hardTruths: [
      "Връзката приключи много преди да я прекратим",
      "Игнорирах червените знамена твърде дълго",
      "Искахме различни неща, но никой не го призна",
    ],
    goodFacts: [
      "Накрая намерих смелостта да пусна",
      "Свободен съм да намеря някой, който наистина ме цени",
      "Научих какво не искам в партньор",
    ],
    lessons: [
      "Оставането заради комфорт не е същото като любов",
      "Заслужавам някой, който се бори за нас",
      "Краищата могат да бъдат нови начала",
    ],
  },

  // Wedding related
  wedding: {
    hardTruths: [
      "Усетих се невидим на тяхната сватба",
      "Гледането как продължават напред беше по-трудно от очакваното",
      "Осъзнах какво можехме да имаме",
    ],
    goodFacts: [
      "Показах сила, като присъствах",
      "Мога да бъда щастлив за тях въпреки болката си",
      "Справих се с грация и достойнство",
    ],
    lessons: [
      "Тяхното щастие не намалява моето",
      "Приключването идва отвътре, не от събития",
      "Способен съм да продължа напред",
    ],
  },

  // Holiday related
  holiday: {
    hardTruths: [
      "Празниците се усещаха празни без тях",
      "Семейните събирания подчертаха какво загубих",
      "Усетих се като чужденец на познати места",
    ],
    goodFacts: [
      "Създадох нови традиции за себе си",
      "Намерих радост на неочаквани места",
      "Някои членове на семейството наистина се появиха за мен",
    ],
    lessons: [
      "Празниците могат да бъдат предефинирани и възвърнати",
      "Традициите се развиват и това е нормално",
      "Мога да създам радост независимо",
    ],
  },

  // Christmas related
  christmas: {
    hardTruths: [
      "Коледа ми напомни какво загубих",
      "Празното място на масата боля повече от очакваното",
      "Всички други изглеждаха щастливи, докато аз се борех",
    ],
    goodFacts: [
      "Преживях най-трудния празничен сезон",
      "Намерих моменти на мир и благодарност",
      "Научих, че съм по-силен, отколкото мислех",
    ],
    lessons: [
      "Скръбта и радостта могат да съществуват заедно",
      "Добре е да се чувствам различно от другите",
      "Следващата година ще бъде по-лесна",
    ],
  },

  // Vacation/trip related
  vacation: {
    hardTruths: [
      "Пътуването, което планирахме заедно, никога не се случи",
      "Видях ги на ваканция с някой нов",
      "Нашите мечти за пътуване умряха с връзката",
    ],
    goodFacts: [
      "Направих това пътуване сам и го обичах",
      "Открих нови места на собствените си условия",
      "Доказах, че не ми трябва партньор за да изследвам",
    ],
    lessons: [
      "Независимостта може да бъде освобождаваща",
      "Самостоятелните приключения са също толкова значими",
      "Мога да създам спомени без тях",
    ],
  },

  // Trip related
  trip: {
    hardTruths: [
      "Нашите планирани пътувания заедно никога не се реализираха",
      "Пътуваха без мен до места, за които мечтаехме",
      "Пътуването заедно разкри нашата несъвместимост",
    ],
    goodFacts: [
      "Планирам пътувания, които ме вълнуват",
      "Сега мога да пътувам където искам",
      "Самостоятелните пътувания ме научиха на независимост",
    ],
    lessons: [
      "Приключението не изисква партньор",
      "Мога да изследвам света на собствените си условия",
      "Плановете за пътуване трябва да съответстват на желанията ми, а не на компромиси",
    ],
  },

  // Walk related
  walk: {
    hardTruths: [
      "Нашите разходки заедно станаха мълчаливи и неудобни",
      "Никога не искаха да ходят с мен",
      "Ходенето сам ми напомняше какво загубих",
    ],
    goodFacts: [
      "Ходенето сам е мирно и медитативно",
      "Мога да ходя където искам, в моето собствено темпо",
      "Разходките ми помагат да обработвам и да се изцелявам",
    ],
    lessons: [
      "Усамотението в природата е изцеляващо",
      "Придвижването напред буквално ми помага да се придвижа емоционално",
      "Мога да намеря мир в простите моменти сам",
    ],
  },

  // Mountain related
  mountain: {
    hardTruths: [
      "Планините, които планирахме да изкачим заедно, остават неизкачени",
      "Достигнаха върхове без мен",
      "Планинските приключения, за които мечтаехме, никога не се случиха",
    ],
    goodFacts: [
      "Сега покорявам собствените си планини",
      "Планинските гледки ми напомнят за по-голямата картина на живота",
      "Катеренето ме учи, че мога да надвия всичко",
    ],
    lessons: [
      "Мога да достигна върхове сам",
      "Пътят нагоре е също толкова важен, колкото и гледката",
      "Всеки връх доказва моята сила",
    ],
  },

  // Lake related
  lake: {
    hardTruths: [
      "Спомените край езерото, които споделяхме, сега са горчиво-сладки",
      "Наслаждаваха се на водата без мен",
      "Нашите мирни моменти край езерото са изчезнали",
    ],
    goodFacts: [
      "Езерата все още ми носят мир и спокойствие",
      "Водата има успокояващ, изцеляващ ефект",
      "Мога да намеря спокойствие край водата сам",
    ],
    lessons: [
      "Мирът на природата принадлежи на всички",
      "Спокойните води отразяват моята вътрешна спокойност",
      "Мога да възвърна мирните места за себе си",
    ],
  },

  // Sand/beach related
  sand: {
    hardTruths: [
      "Ходенето по пясъка заедно се усещаше като ходене върху счупени обещания",
      "Плажът ми напомня за планове, които се измиха",
      "Нашите следи в пясъка бяха временни, като нашата връзка",
    ],
    goodFacts: [
      "Пясъкът между пръстите ми все още се усеща заземяващ",
      "Плажовете са места за обновление и пускане",
      "Всяка вълна измива малко повече болка",
    ],
    lessons: [
      "Като пясъка, мога да се преоформя",
      "Приливът винаги идва свеж и нов",
      "Плажните спомени могат да бъдат върнати за нови начала",
    ],
  },

  // Work/job related
  work: {
    hardTruths: [
      "Стресът от кариерата ми допринесе за нашите проблеми",
      "Приоритизирах работата пред връзката",
      "Те никога не разбраха професионалните ми амбиции",
    ],
    goodFacts: [
      "Постигнах професионален растеж по време на трудни времена",
      "Работата осигури стабилност, когато животът беше хаотичен",
      "Доказах, че мога да успея независимо",
    ],
    lessons: [
      "Балансът между работа и живот е от решаващо значение",
      "Партньорът трябва да подкрепя амбициите ми",
      "Успехът не означава нищо без удовлетвореност",
    ],
  },

  // Family related
  family: {
    hardTruths: [
      "Семейството ми никога наистина не ги прие",
      "Семейните събития станаха неудобни и болезнени",
      "Загубих някои семейни връзки при раздялата",
    ],
    goodFacts: [
      "Семейството ми ме подкрепи през всичко това",
      "Засилих връзките със сестри и братя",
      "Семейството ми помогна да видя стойността си",
    ],
    lessons: [
      "Семейната мъдрост често вижда това, което ние не можем",
      "Кръвта е по-гъста от счупените обещания",
      "Истинското семейство се появява в криза",
    ],
  },

  // Moving/relocation related
  move: {
    hardTruths: [
      "Избраха място пред нашата връзка",
      "Разстоянието разкри истинската ни ангажираност",
      "Жертвах местоположението си за нищо",
    ],
    goodFacts: [
      "Намерих нов дом и нови начала",
      "Преместването ми даде пространство за изцеление",
      "Изградих живот, който е наистина мой",
    ],
    lessons: [
      "Домът е там, където го създам, не там където са те",
      "Географията не може да оправи проблеми във връзката",
      "Способен съм да започна отново навсякъде",
    ],
  },

  // Fight/argument related
  fight: {
    hardTruths: [
      "Карахме се за едни и същи неща многократно",
      "Спорове��е станаха по-важни от решенията",
      "Казах неща, които не мога да оттегля",
    ],
    goodFacts: [
      "Научих се да комуникирам нуждите си ясно",
      "Открих границите си чрез конфликт",
      "Някои спорове разкриха несъвместимости рано",
    ],
    lessons: [
      "Как се караме е по-важно от това за какво се караме",
      "Уважението трябва да остане дори в несъгласие",
      "Някои модели не могат да бъдат променени",
    ],
  },

  // Trust/cheating related
  trust: {
    hardTruths: [
      "Доверието беше нарушено и никога не беше напълно възстановено",
      "Останах въпреки че знаех истината",
      "Интуицията ми беше права през цялото време",
    ],
    goodFacts: [
      "Уча се да се доверявам на себе си отново",
      "Не компрометирах ценностите си в края",
      "Избрах самоуважение вместо комфорт",
    ],
    lessons: [
      "Доверието е основата на всичко",
      "След като се счупи, рядко е същото",
      "Трябва да се доверявам на себе си първо",
    ],
  },

  cheat: {
    hardTruths: [
      "Избраха някой друг, докато бяха с мен",
      "Никога не бях достатъчен за тях",
      "Предателството реже по-дълбоко, отколкото признах",
    ],
    goodFacts: [
      "Открих силата си чрез предателството",
      "Научих, че заслужавам пълна лоялност",
      "Намерих самочувствие отвъд тяхното одобрение",
    ],
    lessons: [
      "Изневярата е за техния характер, не за моята стойност",
      "Заслужавам непоколебима вярност",
      "Предателството учи кои са хората наистина",
    ],
  },

  // Lie/dishonesty related
  lie: {
    hardTruths: [
      "Лъгаха за важни неща",
      "Приемах полуистини твърде дълго",
      "Основата беше изградена на измама",
    ],
    goodFacts: [
      "В крайна сметка видях през лъжите",
      "Научих се да разпознавам нечестността",
      "Ценя автентичността повече от всякога",
    ],
    lessons: [
      "Честността е ненадминаема",
      "Малките лъжи разкриват по-големи недостатъци в характера",
      "Истината е единствената основа за любов",
    ],
  },

  // Friends related
  friend: {
    hardTruths: [
      "Някои приятели застанаха от тяхната страна",
      "Загубих взаимни приятели при раздялата",
      "Приятелите виждаха проблеми, които не можех да видя",
    ],
    goodFacts: [
      "Истинските приятели останаха до мен",
      "Създадох нови, по-дълбоки приятелства",
      "Приятелите ми помогнаха да се преоткрия",
    ],
    lessons: [
      "Истинските приятели се разкриват в трудностите",
      "Качеството има значение повече от количеството",
      "Приятелството е избор, не задължение",
    ],
  },

  // Pet related
  pet: {
    hardTruths: [
      "Трябваше да решим кой ще запази домашния любимец",
      "Домашният любимец също ги липсва",
      "Споделената грижа за домашен любимец е разбиваща сърцето",
    ],
    goodFacts: [
      "Нашият домашен любимец дава безусловна любов",
      "Имам верен спътник през това",
      "Домашният любимец ни донесе радост дори в трудни времена",
    ],
    lessons: [
      "Домашните любимци ни обичат през всичко",
      "Простата компания може да изцели",
      "Безусловната любов все още съществува",
    ],
  },

  // Home/house related
  home: {
    hardTruths: [
      "Домът, който изградихме заедно, сега е просто място",
      "Всеки ъгъл крие болезнени спомени",
      "Трябваше да напусна дома, който обичах",
    ],
    goodFacts: [
      "Създавам ново пространство, което е наистина мое",
      "Къщата никога не беше това, което го правеше дом",
      "Мога да започна отначало без тези спомени",
    ],
    lessons: [
      "Домът е чувство, не място",
      "Мога да създам убежище навсякъде",
      "Пространствата могат да бъдат върнати и предефинирани",
    ],
  },

  // Money/financial related
  money: {
    hardTruths: [
      "Финансовият стрес разкри нашата несъвместимост",
      "Ценяха парите повече от връзката ни",
      "Бях използван финансово",
    ],
    goodFacts: [
      "Сега съм финансово независим",
      "Научих се да управлявам парите сам",
      "Финансовата свобода е овластяваща",
    ],
    lessons: [
      "Финансовите ценности трябва да се съвпадат във взаимоотношенията",
      "Независимостта е безценна",
      "Парите разкриват характер",
    ],
  },

  // Apology related
  apology: {
    hardTruths: [
      "Извинението дойде твърде късно",
      "Думите без действия са безсмислени",
      "Заслужавах извинение, което никога не дойде",
    ],
    goodFacts: [
      "Научих се да се извинявам на себе си",
      "Не ми трябва тяхното извинение, за да се изцеля",
      "Мога да простя, без да приемам извинения",
    ],
    lessons: [
      "Приключването не изисква тяхното участие",
      "Действията говорят по-силно от извиненията",
      "Мога да продължа напред без тяхното съжаление",
    ],
  },

  // Promise/commitment related
  promise: {
    hardTruths: [
      "Обещанията бяха нарушени без втора мисъл",
      "Думите бяха евтини, ангажираността беше по-евтина",
      "Вярвах на обещания, на които не трябваше да вярвам",
    ],
    goodFacts: [
      "Научих стойността на собствената си дума",
      "Спазвам обещанията към себе си сега",
      "Разпознавам празните обещания бързо сега",
    ],
    lessons: [
      "Наблюдавайте действията, не думите",
      "Спазвайте обещанията към себе си на първо място",
      "Ангажираността се показва в поведението, не в речта",
    ],
  },

  // Graduation related
  graduation: {
    hardTruths: [
      "Не бяха там за моето голямо постижение",
      "Празнувах сам това, което трябваше да бъде споделено",
      "Тяхното отсъствие омърси момент, за който работех усилено",
    ],
    goodFacts: [
      "Постигнах тази граница сам",
      "Моето постижение не зависи от тяхното присъствие",
      "Доказах, че мога да успея независимо",
    ],
    lessons: [
      "Празнувам успехите си с тях или без тях",
      "Постиженията са само мои",
      "Успехът е по-сладък, когато е наистина мой",
    ],
  },

  // Promotion/job success related
  promotion: {
    hardTruths: [
      "Не празнуваха моя професионален успех",
      "Моите постижения не означаваха нищо за тях",
      "Работех усилено, но се чувствах неподкрепен",
    ],
    goodFacts: [
      "Заработих това чрез собствените си усилия",
      "Моят професионален растеж показва моята устойчивост",
      "Изграждам живот, който е наистина мой",
    ],
    lessons: [
      "Не ми трябва тяхното одобрение, за да успея",
      "Професионалният растеж се случва с тях или без тях",
      "Моята стойност не се измерва от тяхното признание",
    ],
  },

  // Illness/health related
  illness: {
    hardTruths: [
      "Не бяха там, когато бях болен",
      "Усетих се сам по време на най-уязвимите ми моменти",
      "Моите здравословни проблеми не имаха значение за тях",
    ],
    goodFacts: [
      "Научих се да се грижа за себе си",
      "Открих сила, която не знаех, че имам",
      "Преживях без тяхната подкрепа",
    ],
    lessons: [
      "Трябва да приоритизирам собственото си здраве",
      "Самообгрижването не е егоистично, то е необходимо",
      "Мога да разчитам на себе си в болест",
    ],
  },

  // Hospital/medical related
  hospital: {
    hardTruths: [
      "Никога не ме посетиха в болницата",
      "Изправих се срещу страха си сам, когато се нуждаех от подкрепа",
      "Медицинските спешни случаи разкриха техните истински приоритети",
    ],
    goodFacts: [
      "Справих се с медицинските предизвикателства със смелост",
      "Научих, че съм по-силен, отколкото мислех",
      "Имам хора, които наистина се грижат за моето здраве",
    ],
    lessons: [
      "Истинската грижа се появява в криза",
      "Здравословните спешни случаи разкриват характера",
      "Заслужавам подкрепа в най-трудните ми моменти",
    ],
  },

  // Concert/music event related
  concert: {
    hardTruths: [
      "Планирахме да отидем заедно, но те отидоха с някой друг",
      "Присъствах сам, помнейки нашите планове",
      "Музиката ми напомни какво споделяхме",
    ],
    goodFacts: [
      "Насладих се на музиката на собствените си условия",
      "Открих, че мога да се забавлявам сам",
      "Музиката все още ми носи радост без тях",
    ],
    lessons: [
      "Не ми трябва спътник, за да се наслаждавам на живота",
      "Споделените интереси не изискват споделени преживявания",
      "Мога да създам нови спомени сам",
    ],
  },

  // Restaurant/dinner related
  restaurant: {
    hardTruths: [
      "Нашият любим ресторант крие твърде много спомени",
      "Ядох сам на места, които открихме заедно",
      "Всяко ядене ми напомняше за нашите разговори",
    ],
    goodFacts: [
      "Сега мога да се наслаждавам на хранене сам",
      "Откривам нови любими места",
      "Храната все още ми носи комфорт и радост",
    ],
    lessons: [
      "Местата могат да бъдат върнати и предефинирани",
      "Мога да намеря радост в простите удоволствия сам",
      "Новите спомени могат да презапишат старите",
    ],
  },

  // Date related
  date: {
    hardTruths: [
      "Отменяха плановете ни в последния момент многократно",
      "Нашите срещи станаха задължения, а не радости",
      "Влагах повече усилия в срещите, отколкото те",
    ],
    goodFacts: [
      "Научих какво прави една добра среща",
      "Знам какво искам в бъдещи срещи",
      "Готов съм за някой, който цени времето ни заедно",
    ],
    lessons: [
      "Срещите трябва да бъдат желани, а не налагани",
      "Усилията в планирането показват грижа",
      "Заслужавам някой, който е въодушевен да прекарва време с мен",
    ],
  },

  // Gift related
  gift: {
    hardTruths: [
      "Никога не влагаха мисъл в подаръците си към мен",
      "Моите подаръци към тях бяха по-значими от техните към мен",
      "Даряването на подаръци стана едностранно",
    ],
    goodFacts: [
      "Научих радостта от даряването без очаквания",
      "Оценявам хора, които помнят специални случаи",
      "Сега мога да си правя значими подаръци",
    ],
    lessons: [
      "Подаръците отразяват замисленост и грижа",
      "Заслужавам някой, който влага усилия да ме направи щастлив",
      "Материалните неща имат по-малко значение от жеста",
    ],
  },

  // Text/message related
  text: {
    hardTruths: [
      "Оставяха съобщенията ми непрочетени в продължение на дни",
      "Едносричните отговори показваха тяхното незаинтересованост",
      "Винаги аз започвах разговорите",
    ],
    goodFacts: [
      "Спрях да чакам отговори, които никога не дойдоха",
      "Научих, че моята стойност не се измерва от времето за отговор",
      "Намерих хора, които наистина искат да разговарят с мен",
    ],
    lessons: [
      "Комуникацията трябва да бъде двупосочна",
      "Ако искаха, щяха да го направят",
      "Заслужавам ентусиазирани партньори за разговор",
    ],
  },

  // Phone call related
  call: {
    hardTruths: [
      "Никога не отговаряха, когато се нуждаех от тях",
      "Телефонните разговори станаха едностранни монолози",
      "Спрях да звъня, защото те никога не звъняха обратно",
    ],
    goodFacts: [
      "Намерих хора, които отговарят, когато звъня",
      "Научих се да разчитам повече на себе си",
      "Не чакам обаждания, които няма да дойдат",
    ],
    lessons: [
      "Достъпността има значение във взаимоотношенията",
      "Заслужавам хора, които искат да чуят от мен",
      "Телефонните обаждания трябва да бъдат желани, а не избягвани",
    ],
  },

  // Party/social event related
  party: {
    hardTruths: [
      "Игнорираха ме на партита, на които присъствахме заедно",
      "Усетих се като непознат на собствените ни събития",
      "Те общуваха, докато аз се чувствах невидим",
    ],
    goodFacts: [
      "Научих се да се наслаждавам на партита независимо",
      "Мога да се забавлявам без тяхното одобрение",
      "Открих, че всъщност съм добър в общуването сам",
    ],
    lessons: [
      "Партньорите трябва да правят един друг да се чувстват включени",
      "Мога да процъфтявам в социални ситуации независимо",
      "Заслужавам някой, който иска да бъда до него",
    ],
  },

  // Coffee/cafe related
  coffee: {
    hardTruths: [
      "Нашите кафе срещи станаха неудобни мълчания",
      "Винаги изглеждаха разсеяни по време на нашите разговори",
      "Забелязах, че предпочитат да бъдат навсякъде другаде",
    ],
    goodFacts: [
      "Научих се да се наслаждавам на кафе сам",
      "Кафенетата станаха моето спокойно пространство",
      "Мога да водя значими разговори със себе си",
    ],
    lessons: [
      "Простите моменти трябва да се усещат удобни",
      "Присъствието е по-важно от мястото",
      "Заслужавам завладяващи разговори над кафе",
    ],
  },

  // School/education related
  school: {
    hardTruths: [
      "Не подкрепяха моите образователни цели",
      "Ученето ми стана източник на конфликт",
      "Виждаха амбициите ми като заплаха",
    ],
    goodFacts: [
      "Продължих образованието си за себе си",
      "Ученето ми дава смисъл и растеж",
      "Образованието е инвестиция в бъдещето ми",
    ],
    lessons: [
      "Партньорът трябва да подкрепя моя растеж",
      "Образованието е ненадминаемо",
      "Изграждам по-добро бъдеще за себе си",
    ],
  },

  // Gym/exercise related
  gym: {
    hardTruths: [
      "Критикуваха целите ми за фитнес",
      "Тренировките станаха нещо, което криех от тях",
      "Накараха ме да се чувствам самосъзнателно за тялото си",
    ],
    goodFacts: [
      "Тренирам за менталното и физическото си здраве",
      "Фитнесът стана моето убежище",
      "Изграждам сила отвътре и отвън",
    ],
    lessons: [
      "Самоусъвършенстването трябва да бъде насърчавано",
      "Моите цели за тялото са само мои",
      "Партньорът трябва да ме издига, а не да ме сваля",
    ],
  },

  // Music/song related
  music: {
    hardTruths: [
      "Нашите песни станаха твърде болезнени за слушане",
      "Музиката, която открихме заедно, сега предизвиква тъга",
      "Развалиха изпълнители, които веднъж обичах",
    ],
    goodFacts: [
      "Откривам нова музика, която е само моя",
      "Музиката все още ме вълнува дълбоко",
      "Мога да намеря нов смисъл в стари песни",
    ],
    lessons: [
      "Музиката може да бъде върната и предефинирана",
      "Изкуството е мое, а не нашите спомени",
      "Новите песни могат да създават нови асоциации",
    ],
  },

  // Movie/film related
  movie: {
    hardTruths: [
      "Вечерите с филми станаха самотни преживявания",
      "Предпочитаха да гледат сам, отколкото с мен",
      "Нашите споделени интереси не се превърнаха в качествено време",
    ],
    goodFacts: [
      "Мога да се наслаждавам на филми сам",
      "Киносалоните станаха моето бягство",
      "Откривам нови любими независимо",
    ],
    lessons: [
      "Споделените интереси се нуждаят от споделени усилия",
      "Мога да намеря радост в самостоятелно забавление",
      "Качественото време е по-важно от дейността",
    ],
  },

  // Photo/picture related
  photo: {
    hardTruths: [
      "Гледането на стари снимки носи повече болка, отколкото радост",
      "Изтриха нашите спомени без колебание",
      "Снимките разкриха истини, които не можех да видя преди",
    ],
    goodFacts: [
      "Правя нови снимки на живота си сега",
      "Снимките документират моя растеж и изцеление",
      "Мога да гледам назад с яснота вместо болка",
    ],
    lessons: [
      "Снимките улавят моменти, не постоянство",
      "Създавам нови спомени, които заслужават да бъдат снимани",
      "Миналото е свършено, но имам бъдеще",
    ],
  },

  // Travel/journey related
  travel: {
    hardTruths: [
      "Пътуването, за което мечтаехме, никога няма да се случи",
      "Плановете за пътуване умряха с връзката",
      "Отидоха на приключения, от които бях изключен",
    ],
    goodFacts: [
      "Планирам пътувания само за мен",
      "Пътуването сам е освобождаващо",
      "Светът все още е пълен с места за откриване",
    ],
    lessons: [
      "Мога да изследвам света сам",
      "Приключението не изисква партньор",
      "Пътуването лекува и разширява перспективите",
    ],
  },

  // Airport related
  airport: {
    hardTruths: [
      "Никога не дойдоха да ме вземат",
      "Сбогуванията на летището разкриха техните истински чувства",
      "Пътуването да ги видя винаги беше едностранно усилие",
    ],
    goodFacts: [
      "Научих се да се ориентирам на летищата независимо",
      "Летищата символизират моята свобода сега",
      "Мога да пътувам където искам, когато искам",
    ],
    lessons: [
      "Усилията трябва да бъдат взаимни в дългите разстояния",
      "Свободен съм да отида навсякъде без разрешение",
      "Пътуването представлява моята независимост",
    ],
  },

  // Beach/water related
  beach: {
    hardTruths: [
      "Нашите плажни спомени сега са горчиво-сладки",
      "Океанът ми напомня за обещания, които се измиха",
      "Обичаха плажа повече, отколкото обичаха мен",
    ],
    goodFacts: [
      "Океанът все още ми носи мир",
      "Плажовете са места на обновление и изцеление",
      "Водата има начин да измие болката",
    ],
    lessons: [
      "Природата лекува независимо от кой е до мен",
      "Необятността на океана поставя нещата в перспектива",
      "Мога да намеря мир на същите места отново",
    ],
  },

  // Park/nature related
  park: {
    hardTruths: [
      "Разходките в парковете ми напомняха какво загубих",
      "Природата се усещаше празна без тях",
      "Нашите любими места станаха места за избягване",
    ],
    goodFacts: [
      "Природата все още ми носи мир и яснота",
      "Парковете са места на изцеление и размисъл",
      "Намирам нови любими места",
    ],
    lessons: [
      "Природата принадлежи на всички",
      "На открито мога да бъде върнат за себе си",
      "Мирът идва отвътре, не от компанията",
    ],
  },

  // Shopping related
  shopping: {
    hardTruths: [
      "Пазаруването заедно стана задача за тях",
      "Критикуваха моите избори и предпочитания",
      "Нашите стилове отразяваха нашата несъвместимост",
    ],
    goodFacts: [
      "Развивам собствен уникален стил",
      "Пазаруването сега е форма на самовыражение",
      "Мога да купувам това, което ме прави щастлив, без осъждане",
    ],
    lessons: [
      "Личният стил е за самовыражение",
      "Не ми трябва одобрение за моите избори",
      "Пазаруването сам може да бъде овластяващо",
    ],
  },

  // Car/driving related
  car: {
    hardTruths: [
      "Никога не искаха да карат да ме видят",
      "Пътуванията с кола станаха мълчаливи и напрегнати",
      "Колата, която споделяхме, сега крие болезнени спомени",
    ],
    goodFacts: [
      "Имам свобода да отида навсякъде",
      "Шофирането сам е мирно и освобождаващо",
      "Пътят напред е мой за избор",
    ],
    lessons: [
      "Независимостта означава да вървя по собствения си път",
      "Аз контролирам накъде се насочвам",
      "Пътуването е по-важно от това кой е на седалката на пътника",
    ],
  },

  // Game/gaming related
  game: {
    hardTruths: [
      "Никога не искаха да играят с мен",
      "Игрите станаха начин да ме избягват",
      "Нашите интереси се разминаха напълно",
    ],
    goodFacts: [
      "Наслаждавам се на игрите на собствените си условия",
      "Игрите са здравословно бягство и забавление",
      "Мога да намеря общности, които споделят моите интереси",
    ],
    lessons: [
      "Хобитата не изискват участие на партньор",
      "Мога да се наслаждавам на интересите си независимо",
      "Споделените интереси не са необходими за съвместимост",
    ],
  },

  // Generic/fallback suggestions
  default: {
    hardTruths: [
      "Игнорирах знаците, които винаги са били там",
      "Останах по-дълго, отколкото трябваше",
      "Компрометирах твърде много от себе си",
    ],
    goodFacts: [
      "Научих какво наистина ми трябва във връзка",
      "Станах по-силен чрез този опит",
      "На една стъпка съм по-близо до правилния човек",
    ],
    lessons: [
      "Растежът идва от най-трудните преживявания",
      "Заслужавам по-добро от това, което приех",
      "Изцелението е пътуване, не дестинация",
    ],
  },
};

/**
 * Get suggestions based on memory title keywords
 * @param memoryTitle - The title of the memory
 * @param language - 'en' or 'bg'
 * @returns Contextual suggestions for moments
 */
export function getSuggestionsForMemory(
  memoryTitle: string,
  language: 'en' | 'bg' = 'en'
): MomentSuggestions {
  const suggestions = language === 'bg' ? suggestionsByKeywordBg : suggestionsByKeyword;
  const normalizedTitle = memoryTitle.toLowerCase();

  // Find matching keyword in the title
  for (const keyword in suggestions) {
    if (keyword !== 'default' && normalizedTitle.includes(keyword)) {
      return suggestions[keyword];
    }
  }

  // Return default suggestions if no match found
  return suggestions.default;
}

/**
 * Get a random hard truth suggestion based on memory title
 * @param memoryTitle - The title of the memory
 * @param language - 'en' or 'bg'
 * @returns A random hard truth suggestion
 */
export function getHardTruthSuggestion(memoryTitle: string, language: 'en' | 'bg' = 'en'): string {
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
export function getGoodFactSuggestion(memoryTitle: string, language: 'en' | 'bg' = 'en'): string {
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
export function getLessonSuggestion(memoryTitle: string, language: 'en' | 'bg' = 'en'): string {
  const suggestions = getSuggestionsForMemory(memoryTitle, language);
  const randomIndex = Math.floor(Math.random() * suggestions.lessons.length);
  return suggestions.lessons[randomIndex];
}
