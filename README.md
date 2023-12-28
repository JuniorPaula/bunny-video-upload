# Upload Video Via API no BunnyCDN

Simple `API` para upload de videos nos CDN´s do `Bunny`.

## Start Server
```bash 
  npm i
  npm run dev
```

## Rota

/upload
`multipart/form-data`
body

- file -> arquivo que sera feito o upload;
- title -> titulo do arquivo que sera salvo no cdn do bunny;
- collectionId -> ID da coleção "pasta" onde o arquivo será salvo;

```json
{
  file: file,
  title: string,
  collectionId: string,
}
```

## Frontend

### Dependencia
- python3

## Start
```bash
python3 -m http.server
```
