document.addEventListener('DOMContentLoaded', function() {
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const loadingDiv = document.getElementById('loading');
    const userInfoDiv = document.getElementById('user-info');
    const loginPromptDiv = document.getElementById('login-prompt');
    const displayNameEl = document.getElementById('display-name');
    const lakBalanceEl = document.getElementById('lak-balance');

    loadingDiv.style.display = 'block';

    auth.onAuthStateChanged(user => {
        if (user) {
            const userDocRef = db.collection('users').doc(user.uid);
            userDocRef.onSnapshot(doc => {
                loadingDiv.style.display = 'none';
                if (doc.exists) {
                    loginPromptDiv.style.display = 'none';
                    userInfoDiv.style.display = 'block';
                    
                    const userData = doc.data();
                    let name = '사용자';
                    if (userData.role === 'admin') name = '관리자';
                    else if (userData.displayName) name = userData.displayName;
                    else if (userData.role === 'teacher') name = `${userData.name} 선생님`;
                    else if (userData.role === 'student' || userData.role === 'council') name = `학생 (${userData.studentId})`;
                    
                    displayNameEl.textContent = name;
                    lakBalanceEl.innerHTML = `${(userData.lak || 0).toLocaleString()} <span>포인트</span>`;
                } else {
                    userInfoDiv.style.display = 'none';
                    loginPromptDiv.style.display = 'block';
                }
            }, error => {
                console.error("Error fetching user data:", error);
                loadingDiv.style.display = 'none';
                userInfoDiv.style.display = 'none';
                loginPromptDiv.style.display = 'block';
            });
        } else {
            loadingDiv.style.display = 'none';
            userInfoDiv.style.display = 'none';
            loginPromptDiv.style.display = 'block';
        }
    });
});
