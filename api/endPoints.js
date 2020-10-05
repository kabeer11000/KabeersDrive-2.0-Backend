const inDev = true;
const hostname = inDev ? `http://localhost:9000` : `https://kabeers-drive.herokuapp.com`;
module.exports = {
  callbackURI: `${hostname}/auth/callback`
};
/* Schema */
//https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-child-references/
const sc = {
  itemType: "root#folder" || "folder",
  parent: "folderId",
  childern: [
    {
      itemType: "folder",
      id: "[FOLDER ID]"
    },
    {
      itemType: "file",
      id: "[FILE ID]"
    }
  ]
};
