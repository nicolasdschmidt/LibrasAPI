const express = require('express')
const sql = require('mssql')
const fs = require('fs')

const app = express()
const port = 80

const config = JSON.parse(fs.readFileSync('config.json'))

const pool = new sql.ConnectionPool(config)
pool.connect((err) => {
	if (err) console.error(err)
})

app.get('/', (req, res) => res.sendStatus(200))

app.get('/usuarios', (req, res) => {
	pool.request().query('select * from libras.Usuario', (err, sqlRes) => {
		if (err) res.status(500).send(err)
		else
			res.status(200).send({
				linhas: sqlRes.rowsAffected[0],
				resultado: sqlRes.recordset,
			})
	})
})

app.get('/nivel/*', (req, res) => {
	let usuario = req.url.replace('/nivel/', '').trim()

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

app.listen(port, () => console.log(`Listening at http://localhost:${port}`))
