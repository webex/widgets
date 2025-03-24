import {test, expect} from '@playwright/test';

test.describe('Station Login', () => {
  test('should login using BROWSER login option', async ({page}) => {
    await page.goto('http://localhost:3000/');
    await page.getByText('Contact Center widgets in a react app Dark Theme Select Widgets to Show Station').click();
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page
      .getByRole('textbox', {name: 'Enter your access token'})
      .fill(
        'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLmkySlo1WnR0bzBpZnpFU0UtVm9sVGcuSDN2bWhHUUd0c19jUF8wWm4wWllRT09KVjlISU8wWUROeEt5S0Z1d05qbDBaM1docmJlMUcxRk9ydGlQRmUyczduUlNsWlItemxWMEs0NXJpdjBlUzVMd2JDVzJ4V3hOMHYyZmhtLV9QWVRlcmxsSVNXOEFtQUFMMExoZ1pZckNsX2g1cnB4OW5TakhQQmRkeTUtdkN4QXpJZWRtdnExaGxNM2FhdF93M1hiQ25TT2czZF9RajgzZ0pnYVNDbjZoa3R6LW5ua2VIdno3Yjh5amI4OWVQSGt2SWFodHJsMWRjYmVwbkNiNmpnb2xHMmZJbTNURUdCVG1fTWpWTkZnOWdJc2tIdzFCNkliX3V3ZU41S255YzF3NWxWa3ZwS096Y244eFY4SVhtWWMyZ3BVcXcxbjNHdDRNNllhSEQwY25qWENqSFEyYjNicEV5cDRqeXlPY0EwZjdFNC12TXFlenRFaW9wOUdXbWJVRW5pRnhDaEEzMmlBNFlHS2RGejZSaEtNcTZTY2R2ak5YNXZoeWJuaVB6QjFDb1hxQThzeWhrWllEaW55Y2RRMkN0cW5aUXhVdGZHR1pmdmlwZGk3d0FSU0ZSZXNKZ09LN3kxRkFtUmRvUElPNFNjODBHTER6eTZ5ejE1eHVSNXQ5aDFMekJjbUVpMjQyWC1kSXhJSzFmT1EySHZudHNNU2VxbG0ybU9HWm1MNUJjazlWZjBkZzcxaTVOVy16RW9SSmNxLTlHZXhaaGo3R3FJZktYSkpLemhpc3lYYk0wcmtBTFg0Zzhud3lja3o2X0FVN2FNLXh6YWQxQk1lYWF6dUc0NzBKSktFVzBvS0VfVGNIajBJdFplcHp2WjhCMmlCQ1ZTdkZyS2w5eUpZbENBcmN4dmlvd0o2eTJHX2lENTZYOWhRU3ZxaEVJbGd6OE1TTm4xNURVcURBeW9JenN2d2tZYmt6WkItakc0c3N0TkU5THdNc0V1cDNhM1M1bHpvWV9oaWJHVE9ibzdlUGVaR0dLRlVnTGZJMi03Sm5WYjdGWktPVGVrNXpFQTZ2MF9zY01XanRzM0pDS1pqSEg3ay54d1k1UWo2QW1XSEVZZ25yaGItOXlRIiwicmVmZXJlbmNlX2lkIjoiZWRlNGY3OTItMDNjOC00MWE0LTkyMTAtZjU5MmMwZWRhZGI1IiwiaXNzIjoiaHR0cHM6Ly9pZGJyb2tlci1iLXVzLndlYmV4LmNvbS9pZGIiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQiLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBOR0kwTm1FeE0ySXRPR013WmkwME1HSXlMV0ZsWlRJdE5qa3hNMk5rWXpRMVlUY3daVFE1WVRObVkyTXRNMk5pIiwidXNlcl9tb2RpZnlfdGltZXN0YW1wIjoiMjAyNTAzMTcwNjUxMTQuMTY4WiIsInJlYWxtIjoiZDllYzMyZDMtMmU4ZC00MTFhLWJjY2UtZWIyZTVlMmViNzljIiwiY2lzX3V1aWQiOiJlZDYxMmFlYy1iYWZlLTQwNGQtYjliMi1lYTdkZTIzYTA0ZjAiLCJleHBpcnlfdGltZSI6MTc0Mjg5NjA4MjYwNH0.P0p3uG_tHhKYtMYFOI58C1CA3Upk9aPevTL2DrheSfVdfaFsG7D6hyNVQrx0Vkh_kvT2N--QJNHN7Dkb2hhOZ5-T_uQjP6jy3cvrIIl8tVec8edOlKbd3DUiZSuvWW-8UL7BQUvYQHb-lrehjSsccgXGCNxqR-WqKikdE37jHJsC1xQK1PqO-sYrEOriSjtCLV7NOcKhJbfW2wp4I6qKwQQ4oiRZnUxszFJPjtCaEdxWvJDhLYGyJiwkdl_ipFm9AeiTIF_c4jMmXqGYqgRwldDZN0BETRqsIX0ZgviA-y851RTvPq_NvTNobdAR2LTiX3KosrL4Iz7bvsYQYSywcw'
      );
    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page.getByRole('button', {name: 'Init Widgets'}).click();

    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-BROWSER').click();

    await expect(page.getByTestId('login-option-select').locator('mdc-text')).toContainText('BROWSER');
    await expect(page.getByTestId('login-button').locator('span')).toContainText('Save & Continue');

    await page.getByTestId('login-button').click();

    await page.getByTestId('state-select').click();
    await expect(page.getByTestId('state-select')).toBeVisible();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');

    await page.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Available');

    await expect(page.getByTestId('logout-button').locator('span')).toContainText('Logout');
    await page.getByTestId('logout-button').click();

    await expect(page.getByTestId('login-button').locator('span')).toContainText('Save & Continue');
  });

  test('should login accross tabs', async ({browser}) => {
    const context = await browser.newContext();

    const page = await context.newPage();
    const page2 = await context.newPage();

    await page.locator('body').click();
    await page.goto('http://localhost:3000/');
    await page2.goto('http://localhost:3000/');
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page
      .getByRole('textbox', {name: 'Enter your access token'})
      .fill(
        'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLmkySlo1WnR0bzBpZnpFU0UtVm9sVGcuSDN2bWhHUUd0c19jUF8wWm4wWllRT09KVjlISU8wWUROeEt5S0Z1d05qbDBaM1docmJlMUcxRk9ydGlQRmUyczduUlNsWlItemxWMEs0NXJpdjBlUzVMd2JDVzJ4V3hOMHYyZmhtLV9QWVRlcmxsSVNXOEFtQUFMMExoZ1pZckNsX2g1cnB4OW5TakhQQmRkeTUtdkN4QXpJZWRtdnExaGxNM2FhdF93M1hiQ25TT2czZF9RajgzZ0pnYVNDbjZoa3R6LW5ua2VIdno3Yjh5amI4OWVQSGt2SWFodHJsMWRjYmVwbkNiNmpnb2xHMmZJbTNURUdCVG1fTWpWTkZnOWdJc2tIdzFCNkliX3V3ZU41S255YzF3NWxWa3ZwS096Y244eFY4SVhtWWMyZ3BVcXcxbjNHdDRNNllhSEQwY25qWENqSFEyYjNicEV5cDRqeXlPY0EwZjdFNC12TXFlenRFaW9wOUdXbWJVRW5pRnhDaEEzMmlBNFlHS2RGejZSaEtNcTZTY2R2ak5YNXZoeWJuaVB6QjFDb1hxQThzeWhrWllEaW55Y2RRMkN0cW5aUXhVdGZHR1pmdmlwZGk3d0FSU0ZSZXNKZ09LN3kxRkFtUmRvUElPNFNjODBHTER6eTZ5ejE1eHVSNXQ5aDFMekJjbUVpMjQyWC1kSXhJSzFmT1EySHZudHNNU2VxbG0ybU9HWm1MNUJjazlWZjBkZzcxaTVOVy16RW9SSmNxLTlHZXhaaGo3R3FJZktYSkpLemhpc3lYYk0wcmtBTFg0Zzhud3lja3o2X0FVN2FNLXh6YWQxQk1lYWF6dUc0NzBKSktFVzBvS0VfVGNIajBJdFplcHp2WjhCMmlCQ1ZTdkZyS2w5eUpZbENBcmN4dmlvd0o2eTJHX2lENTZYOWhRU3ZxaEVJbGd6OE1TTm4xNURVcURBeW9JenN2d2tZYmt6WkItakc0c3N0TkU5THdNc0V1cDNhM1M1bHpvWV9oaWJHVE9ibzdlUGVaR0dLRlVnTGZJMi03Sm5WYjdGWktPVGVrNXpFQTZ2MF9zY01XanRzM0pDS1pqSEg3ay54d1k1UWo2QW1XSEVZZ25yaGItOXlRIiwicmVmZXJlbmNlX2lkIjoiZWRlNGY3OTItMDNjOC00MWE0LTkyMTAtZjU5MmMwZWRhZGI1IiwiaXNzIjoiaHR0cHM6Ly9pZGJyb2tlci1iLXVzLndlYmV4LmNvbS9pZGIiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQiLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBOR0kwTm1FeE0ySXRPR013WmkwME1HSXlMV0ZsWlRJdE5qa3hNMk5rWXpRMVlUY3daVFE1WVRObVkyTXRNMk5pIiwidXNlcl9tb2RpZnlfdGltZXN0YW1wIjoiMjAyNTAzMTcwNjUxMTQuMTY4WiIsInJlYWxtIjoiZDllYzMyZDMtMmU4ZC00MTFhLWJjY2UtZWIyZTVlMmViNzljIiwiY2lzX3V1aWQiOiJlZDYxMmFlYy1iYWZlLTQwNGQtYjliMi1lYTdkZTIzYTA0ZjAiLCJleHBpcnlfdGltZSI6MTc0Mjg5NjA4MjYwNH0.P0p3uG_tHhKYtMYFOI58C1CA3Upk9aPevTL2DrheSfVdfaFsG7D6hyNVQrx0Vkh_kvT2N--QJNHN7Dkb2hhOZ5-T_uQjP6jy3cvrIIl8tVec8edOlKbd3DUiZSuvWW-8UL7BQUvYQHb-lrehjSsccgXGCNxqR-WqKikdE37jHJsC1xQK1PqO-sYrEOriSjtCLV7NOcKhJbfW2wp4I6qKwQQ4oiRZnUxszFJPjtCaEdxWvJDhLYGyJiwkdl_ipFm9AeiTIF_c4jMmXqGYqgRwldDZN0BETRqsIX0ZgviA-y851RTvPq_NvTNobdAR2LTiX3KosrL4Iz7bvsYQYSywcw'
      );
    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page.getByRole('button', {name: 'Init Widgets'}).click();
    await page2.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page2
      .getByRole('textbox', {name: 'Enter your access token'})
      .fill(
        'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLmkySlo1WnR0bzBpZnpFU0UtVm9sVGcuSDN2bWhHUUd0c19jUF8wWm4wWllRT09KVjlISU8wWUROeEt5S0Z1d05qbDBaM1docmJlMUcxRk9ydGlQRmUyczduUlNsWlItemxWMEs0NXJpdjBlUzVMd2JDVzJ4V3hOMHYyZmhtLV9QWVRlcmxsSVNXOEFtQUFMMExoZ1pZckNsX2g1cnB4OW5TakhQQmRkeTUtdkN4QXpJZWRtdnExaGxNM2FhdF93M1hiQ25TT2czZF9RajgzZ0pnYVNDbjZoa3R6LW5ua2VIdno3Yjh5amI4OWVQSGt2SWFodHJsMWRjYmVwbkNiNmpnb2xHMmZJbTNURUdCVG1fTWpWTkZnOWdJc2tIdzFCNkliX3V3ZU41S255YzF3NWxWa3ZwS096Y244eFY4SVhtWWMyZ3BVcXcxbjNHdDRNNllhSEQwY25qWENqSFEyYjNicEV5cDRqeXlPY0EwZjdFNC12TXFlenRFaW9wOUdXbWJVRW5pRnhDaEEzMmlBNFlHS2RGejZSaEtNcTZTY2R2ak5YNXZoeWJuaVB6QjFDb1hxQThzeWhrWllEaW55Y2RRMkN0cW5aUXhVdGZHR1pmdmlwZGk3d0FSU0ZSZXNKZ09LN3kxRkFtUmRvUElPNFNjODBHTER6eTZ5ejE1eHVSNXQ5aDFMekJjbUVpMjQyWC1kSXhJSzFmT1EySHZudHNNU2VxbG0ybU9HWm1MNUJjazlWZjBkZzcxaTVOVy16RW9SSmNxLTlHZXhaaGo3R3FJZktYSkpLemhpc3lYYk0wcmtBTFg0Zzhud3lja3o2X0FVN2FNLXh6YWQxQk1lYWF6dUc0NzBKSktFVzBvS0VfVGNIajBJdFplcHp2WjhCMmlCQ1ZTdkZyS2w5eUpZbENBcmN4dmlvd0o2eTJHX2lENTZYOWhRU3ZxaEVJbGd6OE1TTm4xNURVcURBeW9JenN2d2tZYmt6WkItakc0c3N0TkU5THdNc0V1cDNhM1M1bHpvWV9oaWJHVE9ibzdlUGVaR0dLRlVnTGZJMi03Sm5WYjdGWktPVGVrNXpFQTZ2MF9zY01XanRzM0pDS1pqSEg3ay54d1k1UWo2QW1XSEVZZ25yaGItOXlRIiwicmVmZXJlbmNlX2lkIjoiZWRlNGY3OTItMDNjOC00MWE0LTkyMTAtZjU5MmMwZWRhZGI1IiwiaXNzIjoiaHR0cHM6Ly9pZGJyb2tlci1iLXVzLndlYmV4LmNvbS9pZGIiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQiLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBOR0kwTm1FeE0ySXRPR013WmkwME1HSXlMV0ZsWlRJdE5qa3hNMk5rWXpRMVlUY3daVFE1WVRObVkyTXRNMk5pIiwidXNlcl9tb2RpZnlfdGltZXN0YW1wIjoiMjAyNTAzMTcwNjUxMTQuMTY4WiIsInJlYWxtIjoiZDllYzMyZDMtMmU4ZC00MTFhLWJjY2UtZWIyZTVlMmViNzljIiwiY2lzX3V1aWQiOiJlZDYxMmFlYy1iYWZlLTQwNGQtYjliMi1lYTdkZTIzYTA0ZjAiLCJleHBpcnlfdGltZSI6MTc0Mjg5NjA4MjYwNH0.P0p3uG_tHhKYtMYFOI58C1CA3Upk9aPevTL2DrheSfVdfaFsG7D6hyNVQrx0Vkh_kvT2N--QJNHN7Dkb2hhOZ5-T_uQjP6jy3cvrIIl8tVec8edOlKbd3DUiZSuvWW-8UL7BQUvYQHb-lrehjSsccgXGCNxqR-WqKikdE37jHJsC1xQK1PqO-sYrEOriSjtCLV7NOcKhJbfW2wp4I6qKwQQ4oiRZnUxszFJPjtCaEdxWvJDhLYGyJiwkdl_ipFm9AeiTIF_c4jMmXqGYqgRwldDZN0BETRqsIX0ZgviA-y851RTvPq_NvTNobdAR2LTiX3KosrL4Iz7bvsYQYSywcw'
      );
    await page2.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page2.getByRole('button', {name: 'Init Widgets'}).click();
    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-BROWSER').getByText('BROWSER').click();
    await page.getByTestId('login-button').click();
    await expect(page2.getByTestId('logout-button').locator('span')).toContainText('Logout');
    await expect(page2.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');
    await page2.getByTestId('state-select').click();
    await page2.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-name')).toContainText('Available');
    await page.getByTestId('logout-button').click();
    await expect(page2.getByTestId('login-button').locator('span')).toContainText('Save & Continue');
  });
});
