import userApi from "./api/user.api";

// usage
async function getUserList() {
  const userList = await userApi.query({ page: 1, size: 10 });
  if (userList !== undefined) {
    console.log(userList);
  }
}
