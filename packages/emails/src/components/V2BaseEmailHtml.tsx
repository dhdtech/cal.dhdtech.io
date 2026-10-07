/* eslint-disable @next/next/no-head-element */
import BaseTable from "./BaseTable";
import EmailBodyLogo from "./EmailBodyLogo";
import EmailHead from "./EmailHead";
import EmailScheduledBodyHeaderContent from "./EmailScheduledBodyHeaderContent";
import EmailSchedulingBodyDivider from "./EmailSchedulingBodyDivider";
import EmailSchedulingBodyHeader, { BodyHeadType } from "./EmailSchedulingBodyHeader";
import RawHtml from "./RawHtml";
import Row from "./Row";

const Html = (props: { children: React.ReactNode }) => (
  <>
    <RawHtml html="<!doctype html>" />
    <html>{props.children}</html>
  </>
);

export const V2BaseEmailHtml = (props: {
  children: React.ReactNode;
  callToAction?: React.ReactNode;
  subject: string;
  title?: string;
  subtitle?: React.ReactNode;
  headerType?: BodyHeadType;
}) => {
  return (
    <Html>
      <EmailHead title={props.subject} />
      <body style={{ wordSpacing: "normal", backgroundColor: "#0a0a0a" }}>
        <div style={{ backgroundColor: "#0a0a0a" }}>
          <RawHtml
            html={`<!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->`}
          />
          <div style={{ margin: "0px auto", maxWidth: 600 }}>
            <Row align="center" border="0" style={{ width: "100%" }}>
              <td
                style={{
                  direction: "ltr",
                  fontSize: "0px",
                  padding: "0px",
                  paddingTop: "40px",
                  textAlign: "center",
                }}>
                <RawHtml
                  html={`<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->`}
                />
              </td>
            </Row>
          </div>
          {props.headerType && <EmailSchedulingBodyHeader headerType={props.headerType} />}
          {props.title && <EmailScheduledBodyHeaderContent title={props.title} subtitle={props.subtitle} />}
          {(props.headerType || props.title || props.subtitle) && <EmailSchedulingBodyDivider />}

          <RawHtml
            html={`<!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" className="" style="width:600px;" width="600" bgcolor="#101010" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->`}
          />
          <div
            style={{
              margin: "0px auto",
              maxWidth: 600,
            }}>
            <Row align="center" border="0" style={{ width: "100%" }}>
              <td
                style={{
                  direction: "ltr",
                  fontSize: 0,
                  padding: 0,
                  textAlign: "center",
                }}>
                <RawHtml
                  html={`<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td className="" style="vertical-align:top;width:598px;" ><![endif]-->`}
                />
                <div
                  className="mj-column-per-100 mj-outlook-group-fix"
                  style={{
                    fontSize: 0,
                    textAlign: "left",
                    direction: "ltr",
                    display: "inline-block",
                    verticalAlign: "top",
                    width: "100%",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 0,
                  }}>
                  <Row
                    border="0"
                    style={{
                      verticalAlign: "top",
                      borderRadius: 0,
                      background: "#101010",
                      backgroundColor: "#101010",
                    }}
                    width="100%">
                    <td
                      align="left"
                      style={{
                        fontSize: 0,
                        padding: "40px",

                        wordBreak: "break-word",
                      }}>
                      <div
                        style={{
                          fontFamily: "Roboto, Helvetica, sans-serif",
                          fontSize: 16,
                          fontWeight: 500,
                          lineHeight: 1,
                          textAlign: "left",
                          color: "#828a97",
                        }}>
                        {props.children}
                      </div>
                    </td>
                  </Row>
                </div>
                <RawHtml html="<!--[if mso | IE]></td></tr></table><![endif]-->" />
              </td>
            </Row>
          </div>
          {props.callToAction && <EmailSchedulingBodyDivider />}
          <RawHtml
            html={`<!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" className="" style="width:600px;" width="600" bgcolor="#101010" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->`}
          />

          <div
            style={{
              margin: "0px auto",
              maxWidth: 600,
            }}>
            <Row align="center" border="0" style={{ width: "100%" }}>
              <td
                style={{
                  direction: "ltr",
                  fontSize: 0,
                  padding: 0,
                  textAlign: "center",
                }}>
                <RawHtml
                  html={`<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td className="" style="vertical-align:top;width:598px;" ><![endif]-->`}
                />
                {props.callToAction && (
                  <div
                    className="mj-column-per-100 mj-outlook-group-fix"
                    style={{
                      fontSize: 0,
                      textAlign: "left",
                      direction: "ltr",
                      display: "inline-block",
                      verticalAlign: "top",
                      width: "100%",
                    }}>
                    <BaseTable border="0" style={{ verticalAlign: "top" }} width="100%">
                      <tbody>
                        <tr>
                          <td
                            align="center"
                            vertical-align="middle"
                            style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
                            {props.callToAction}
                          </td>
                        </tr>
                        <tr>
                          <td
                            align="left"
                            style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
                            <div
                              style={{
                                fontFamily: "Roboto, Helvetica, sans-serif",
                                fontSize: 13,
                                lineHeight: 1,
                                textAlign: "left",
                                color: "#e0e0e0",
                              }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </BaseTable>
                  </div>
                )}
                <RawHtml html="<!--[if mso | IE]></td></tr></table><![endif]-->" />
              </td>
            </Row>
          </div>
          <EmailBodyLogo />
          <RawHtml html="<!--[if mso | IE]></td></tr></table><![endif]-->" />
        </div>
      </body>
    </Html>
  );
};
