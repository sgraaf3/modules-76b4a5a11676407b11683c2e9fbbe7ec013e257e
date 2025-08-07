const DB_NAME = 'SportsCRMDB';
const DB_VERSION = 12; // VERSIE VERHOOGD NAAR 11

const USER_PROFILE_STORE = 'userProfile';
const TRAINING_SESSIONS_STORE = 'trainingSessions';
const ADMIN_SECRET_STORE = 'adminSecretData';
const SCHEDULES_STORE = 'schedules';
const LESSON_SCHEDULES_STORE = 'lessonSchedules';
const MEETINGS_STORE = 'meetings';
const MESSAGES_STORE = 'messages';
const MEMBER_DATA_STORE = 'memberData';
const MEMBER_ACTIVITY_STORE = 'memberActivity';
const POPULARITY_STORE = 'popularityData';
const MEMBER_SETTINGS_STORE = 'memberSettings';
const SUBSCRIPTIONS_STORE = 'subscriptions';
const LOGS_STORE = 'logs';
const REGISTRY_STORE = 'registry';
const MEMBER_MEMBERSHIP_STORE = 'memberMemberships';
const FINANCE_STORE = 'finance';
const DOCS_STORE = 'documents';
const TOGGLE_SETTINGS_STORE = 'toggleSettings';
const DASHBOARD_SETTINGS_STORE = 'dashboardSettings';
const NUTRITION_PROGRAMS_STORE = 'nutritionPrograms';
const SPORT_STORE = 'sportData';
const ACTIVITIES_STORE = 'activitiesData';
const PERMISSIONS_STORE = 'permissionsData';
const NOTES_STORE = 'notesData';
const ACTION_CENTER_STORE = 'actionCenterData';
const USER_ROLE_STORE = 'userRoles';
const SLEEP_DATA_STORE = 'sleepData';

let dbInstance;

export async function openDatabase() {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const stores = [
                USER_PROFILE_STORE, TRAINING_SESSIONS_STORE, ADMIN_SECRET_STORE,
                SCHEDULES_STORE, LESSON_SCHEDULES_STORE, MEETINGS_STORE,
                MESSAGES_STORE, MEMBER_DATA_STORE, MEMBER_ACTIVITY_STORE,
                POPULARITY_STORE, MEMBER_SETTINGS_STORE, SUBSCRIPTIONS_STORE,
                LOGS_STORE, REGISTRY_STORE, MEMBER_MEMBERSHIP_STORE,
                FINANCE_STORE, DOCS_STORE, TOGGLE_SETTINGS_STORE,
                DASHBOARD_SETTINGS_STORE, NUTRITION_PROGRAMS_STORE,
                SPORT_STORE, ACTIVITIES_STORE, PERMISSIONS_STORE, NOTES_STORE, ACTION_CENTER_STORE,
                USER_ROLE_STORE,
                SLEEP_DATA_STORE,
                'restSessionsFree',
                'restSessionsAdvanced'
            ];

            stores.forEach(storeName => {
                // Controleer of de object store al bestaat voordat deze wordt aangemaakt
                if (!db.objectStoreNames.contains(storeName)) {
                    // Gebruik 'id' als keyPath en autoIncrement voor de meeste stores
                    // Specifieke stores zoals userProfile en userRoles hebben mogelijk al een keyPath definitie
                    let options = { keyPath: 'id', autoIncrement: true };
                    if (storeName === USER_PROFILE_STORE) {
                        options = { keyPath: 'id' }; // userProfile gebruikt 'id' als keyPath, geen autoIncrement
                    } else if (storeName === ADMIN_SECRET_STORE) {
                        options = { keyPath: 'id' }; // adminSecretData gebruikt 'id' als keyPath, geen autoIncrement
                    } else if (storeName === USER_ROLE_STORE) {
                        options = { keyPath: 'userId' }; // userRoles gebruikt 'userId' als keyPath, geen autoIncrement
                    }
                    db.createObjectStore(storeName, options);
                }
            });

            // Oude, specifieke aanmaaklogica voor userProfile, adminSecretStore en userRoles
            // Deze zijn nu opgenomen in de algemene loop hierboven, maar laten we ze voor de zekerheid staan als ze unieke opties hadden.
            // Als ze al in de 'stores' array staan en correct worden behandeld, kunnen deze dubbele controles worden verwijderd.
            // Voor nu, zorg ervoor dat ze geen fout veroorzaken als ze al zijn aangemaakt.
            if (!db.objectStoreNames.contains(USER_PROFILE_STORE)) {
                db.createObjectStore(USER_PROFILE_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(ADMIN_SECRET_STORE)) {
                db.createObjectStore(ADMIN_SECRET_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(USER_ROLE_STORE)) {
                db.createObjectStore(USER_ROLE_STORE, { keyPath: 'userId' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            reject(event.target.error);
        };
    });
}

export async function putData(storeName, data) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteData(storeName, id) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getData(storeName, id) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllData(storeName) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getOrCreateUserId() {
    let userId = localStorage.getItem('appUserId');
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('appUserId', userId);
    }
    return userId;
}

export async function getUserRole(userId) {
    const userRole = await getData(USER_ROLE_STORE, userId);
    return userRole ? userRole.role : 'member';
}

export async function setUserRole(userId, role) {
    await putData(USER_ROLE_STORE, { userId: userId, role: role });
}
