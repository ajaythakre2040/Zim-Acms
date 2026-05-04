export const validateNoHtml = (data: any) => {
  const errors: any = {};

  const check = (obj: any) => {
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === "string" && /<[^>]*>?/gm.test(value)) {
        errors[key] = "HTML tags are not allowed";
      }

      if (typeof value === "object" && value !== null) {
        check(value);
      }
    }
  };

  check(data);
  return errors;
};