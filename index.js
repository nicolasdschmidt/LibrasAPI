const express = require('express')
const sql = require('mssql')
const bodyparser = require('body-parser')
const fs = require('fs')
const utf8 = require('utf8');

const SEND_CLIENT_ERROR = false

const app = express()
const port = 80

const config = JSON.parse(fs.readFileSync('config.json'))

const pool = new sql.ConnectionPool(config)
pool.connect((err) => {
	if (err) console.error(err)
})

app.use(bodyparser.json())

app.get('/', (req, res) => {
	if (SEND_CLIENT_ERROR) res.sendStatus(200)
	else res.status(200).send({ status: 200 })
})

app.get('/usuarios', (req, res) => {
	pool.request().query('select * from libras.Usuario', (err, sqlRes) => {
		if (err) res.status(500).send({ status: 500, err: err })
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

	pool.request()
		.input('usuario', sql.VarChar(20), usuario)
		.query(
			'select licao from libras.UsuarioLicao where usuario = @usuario',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset[0],
					})
			}
		)
})

app.get('/usuarios/*/licoes', (req, res) => {
	let usuario = req.url
		.replace('/usuarios/', '')
		.replace('/licoes', '')
		.trim()

	pool.request()
		.input('usuario', sql.VarChar(20), usuario)
		.query(
			'select * from libras.Licao where codigo <= (select licao from libras.UsuarioLicao where usuario = @usuario)',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset[0],
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
				if (err) res.status(500).send({ status: 500, err: err })
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

app.get('/categorias', (req, res) => {
	console.log('get categorias')
	pool.request().query('select * from libras.Categoria', (err, sqlRes) => {
		if (err) res.status(500).send({ status: 500, err: err })
		else
			res.status(200).send({
				linhas: sqlRes.rowsAffected[0],
				resultado: sqlRes.recordset,
			})
	})
})

app.get('/licoes', (req, res) => {
	let categoria = req.query.categoria
	console.log('get licoes ' + categoria)
	pool.request()
		.input('categoria', sql.VarChar(50), categoria)
		.query(
			'select * from libras.Licao where categoria = (select codigo from libras.Categoria where nome = @categoria)',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset,
					})
			}
		)
})

app.get('/sublicao', (req, res) => {
	let licao = req.query.licao
	console.log('get sublicoes ' + licao)
	pool.request()
		.input('licao', sql.Int, licao)
		.query(
			'select * from libras.SubLicao s where s.codigo in (select subLicao from libras.LicaoSubLicao where licao = @licao)',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						linhas: sqlRes.rowsAffected[0],
						resultado: sqlRes.recordset,
					})
			}
		)
})

app.get('/licoes/*', (req, res) => {
	let licao = parseInt(req.url.replace('/licoes/', '').trim())

	pool.request()
		.input('licao', sql.Int, licao)
		.query(
			'select * from libras.LicaoSubLicao where licao = @licao',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
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
				if (err) res.status(500).send({ status: 500, err: err })
				else {
					let responseMessage = sqlRes.recordset[0].responseMessage

					if (responseMessage == 'OK') {
						if (SEND_CLIENT_ERROR) res.sendStatus(200)
						else res.status(200).send({ status: 200 })
					} else if (responseMessage == 'Usuário ou senha incorretos')
						if (SEND_CLIENT_ERROR)
							res.status(401).send(responseMessage)
						else
							res.status(200).send({
								status: 401,
								err: responseMessage,
							})
				}
			}
		)
})

/*app.post('/avancar', (req, res) => {
	let username = req.body.username
	let password = req.body.password

	pool.request()
		.input('username', sql.NVarChar(20), username)
		.input('password', sql.NVarChar(50), password)
		.query(
			"declare @responseMessage nvarchar(250); exec libras.avancar @pUsername = @username, @pPassword = @password, @responseMessage = @responseMessage output; select @responseMessage as N'responseMessage'",
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else {
					let responseMessage = sqlRes.recordset[0].responseMessage

					if (responseMessage == 'OK') {
						if (SEND_CLIENT_ERROR) res.sendStatus(200)
						else res.status(200).send({ status: 200 })
					} else if (responseMessage == 'Falha de autenticação')
						if (SEND_CLIENT_ERROR)
							res.status(401).send(responseMessage)
						else
							res.status(200).send({
								status: 401,
								err: responseMessage,
							})
				}
			}
		)
})*/

app.post('/cadastro', (req, res) => {
	let username = req.body.username
	let fullName = req.body.fullName
	let password = req.body.password

	if (password.length < 8) {
		if (SEND_CLIENT_ERROR)
			res.status(422).send('Senha deve ter pelo menos 8 caracteres')
		else
			res.status(200).send({
				status: 422,
				err: 'Senha deve ter pelo menos 8 caracteres',
			})
		return
	}

	pool.request()
		.input('username', sql.NVarChar(20), username)
		.input('fullname', sql.NVarChar(100), fullName)
		.input('password', sql.NVarChar(50), password)
		.query(
			"declare @responseMessage nvarchar(250); exec libras.addUser @pUsername = @username, @pFullName = @fullName, @pPassword = @password, @responseMessage = @responseMessage output; select @responseMessage as N'responseMessage'",
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else {
					let responseMessage = sqlRes.recordset[0].responseMessage

					let resString = responseMessage + ''

					if (resString == 'OK') {
						if (SEND_CLIENT_ERROR) res.sendStatus(200)
						else res.status(200).send({ status: 200 })
					} else if (
						resString.startsWith(
							'Violation of UNIQUE KEY constraint'
						)
					)
						if (SEND_CLIENT_ERROR)
							res.status(409).send('Nome de usuário já existe')
						else
							res.status(200).send({
								status: 409,
								err: 'Nome de usuário já existe',
							})
					else {
						if (SEND_CLIENT_ERROR) res.status(401).send(resString)
						else
							res.status(200).send({
								status: 401,
								err: resString,
							})
					}
				}
			}
		)
})

app.get('/palavras/*', (req, res) => {
	let letra = req.url.replace('/palavras/?letra=', '').trim()

	pool.request()
		.input('letra', sql.Char, letra)
		.query(
			'select palavra from BD19191.libras.Palavras where letraInicial = @letra',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						palavras: sqlRes.recordset,
					})
			}
		)
})


app.get('/dados_palavra/*', (req, res) => {
	let palavra = req.url.replace('/dados_palavra/?palavra=', '').trim()

	console.log(palavra)

	pool.request()
		.input('palavra', sql.VarChar, palavra)
		.query(
			'select * from BD19191.libras.Palavras where palavra = @palavra',
			(err, sqlRes) => {
				if (err) res.status(500).send({ status: 500, err: err })
				else
					res.status(200).send({
						palavras: sqlRes.recordset[0],
					})
			}
		)
})


app.listen(port, () => console.log(`Listening at http://localhost:${port}`))
