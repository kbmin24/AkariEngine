module.exports = async (req, res, sequelize, users, perm) =>
{
    //req.body.id,req.body.password,req.body.passwordConfirm
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return
    
    if (req.body.password != req.body.passwordConfirm)
    {
        require(global.path + '/info.js')(req, res, null, '비밀번호 확인이 일치하지 않습니다. 올바르게 입력했는지 확인해 주세요.', '/signup', '회원 가입 페이지', 200, 'ko')
        return
    }
    //create hashed PW
    const crypto = require('crypto')
    const salt = crypto.randomBytes(64).toString('base64')

    //create salted & hashed PW
    crypto.pbkdf2(req.body.password, salt, 10000, 64, 'sha512', (err, hashedPW) =>
    {
        if (err) throw new err
        users.create(
        {
            username: req.body.id,
            password: hashedPW.toString('base64'),
            salt: salt
        })
        .then(async () => await require(global.path + '/sendfile.js')(req, res, '회원 가입 완료', '/views/user/signupnotify.html'))
        .catch(err => require(global.path + '/error.js')(req, res, null, '사용자를 생성할 수 없었습니다. 이미 사용 중인 계정명이 아닌지 확인해 주세요.', '/signup', '회원 가입 페이지', 500, 'ko'))
    })
}