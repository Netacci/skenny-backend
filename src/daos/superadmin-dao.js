const checkAdminStatus = async (adminStatus) => {
  if (adminStatus !== 'superAdmin') {
    return {
      success: false,
      code: 401,
    };
  }
  return {
    success: true,
    code: 200,
  };
};

export { checkAdminStatus };
