const express = require('express')
const sql = require('mssql')
const bodyparser = require('body-parser')
const fs = require('fs')

const app = express()
const port = 80

const config = JSON.parse(fs.readFileSync('config.json'))

const pool = new sql.ConnectionPool(config)
pool.connect((err) => {
	if (err) console.error(err)
})

app.use(bodyparser.json())

app.get('/', (req, res) => res.sendStatus(200))

app.get('/usuarios', (req, res) => {
	pool.request().query('select * from libras.Usuario', (err, sqlRes) => {
		if (err) res.status(500).send(err)
		else {
			let usuariosRetorno = []
			sqlRes.recordset.forEach((usuario) => {
				usuariosRetorno.push({
					userId: usuario.userId,
					nomeUsuario: usuario.nomeUsuario,
					nomeCompleto: usuario.nomeCompleto,
				})
			})
			res.status(200).send({
				linhas: sqlRes.rowsAffected[0],
				resultado: usuariosRetorno,
			})
		}
	})
})

app.get('/usuarios/*/nivel/', (req, res) => {
	let usuario = req.url
		.replace('/usuarios/', '')
		.replace('/nivel/', '')
		.replace('/nivel', '')
		.trim()

	console.log(usuario)

	pool.request()
		.input('usuario', sql.VarChar(20), usuario)
		.query(
			'select * from libras.UsuarioLicao where usuario = @usuario',
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset,
					})
			}
		)
})

app.get('/usuarios/*', (req, res) => {
	let id = req.url.replace('/usuarios/', '').trim()
	pool.request()
		.input('id', sql.VarChar(20), id)
		.query(
			'select * from libras.Usuario where userId = @id',
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else {
					if (sqlRes.rowsAffected[0] > 0) {
						let usuarioRetorno = {
							userId: sqlRes.recordset[0].userId,
							nomeUsuario: sqlRes.recordset[0].nomeUsuario,
							nomeCompleto: sqlRes.recordset[0].nomeCompleto,
						}
						res.status(200).send({
							linhas: sqlRes.rowsAffected[0],
							resultado: usuarioRetorno,
						})
					} else {
						res.status(200).send({
							linhas: sqlRes.rowsAffected[0],
							resultado: {},
						})
					}
				}
			}
		)
})

app.get('/licoes', (req, res) => {
	pool.request().query('select * from libras.Licao', (err, sqlRes) => {
		if (err) res.status(500).send(err)
		else
			res.status(200).send({
				linhas: sqlRes.rowsAffected[0],
				resultado: sqlRes.recordset,
			})
	})
})

app.get('/licoes/*', (req, res) => {
	let licao = parseInt(req.url.replace('/licoes/', '').trim())

	/*pool.request()
		.input('licao', sql.Int, licao)
		.query(
			'select * from libras.Licao where codigo = @licao',
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset,
					})
			}
        )*/

	pool.request()
		.input('licao', sql.Int, licao)
		.query(
			'select * from libras.LicaoSubLicao where licao = @licao',
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset,
					})
			}
		)
})

app.post('/login', (req, res) => {
	let username = req.body.username
	let password = req.body.password

	pool.request()
		.input('username', sql.NVarChar(20), username)
		.input('password', sql.NVarChar(50), password)
		.query(
			"declare @responseMessage nvarchar(250); exec libras.authUser @pUsername = @username, @pPassword = @password, @responseMessage = @responseMessage output; select @responseMessage as N'responseMessage'",
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else {
					let responseMessage = sqlRes.recordset[0].responseMessage

					if (responseMessage == 'OK') res.sendStatus(200)
					else if (responseMessage == 'Usuário ou senha incorretos')
						res.status(401).send(responseMessage)
				}
			}
		)
})

app.post('/cadastro', (req, res) => {
	let username = req.body.username
	let fullName = req.body.fullName
	let password = req.body.password

	if (password.length < 8)
		res.status(422).send('Senha deve ter pelo menos 8 caracteres')

	pool.request()
		.input('username', sql.NVarChar(20), username)
		.input('fullname', sql.NVarChar(100), fullName)
		.input('password', sql.NVarChar(50), password)
		.query(
			"declare @responseMessage nvarchar(250); exec libras.addUser @pUsername = @username, @pFullName = @fullName, @pPassword = @password, @responseMessage = @responseMessage output; select @responseMessage as N'responseMessage'",
			(err, sqlRes) => {
				if (err) res.status(500).send(err)
				else {
					let responseMessage = sqlRes.recordset[0].responseMessage

					if (responseMessage == 'OK') res.sendStatus(200)
					else if (
						responseMessage.includes(
							'Violation of UNIQUE KEY constraint'
						)
					)
						res.status(409).send('Nome de usuário já existe')
					else res.status(401).send(responseMessage)
				}
			}
		)
})

app.listen(port, () => console.log(`Listening at http://localhost:${port}`))
