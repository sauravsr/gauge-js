var expect = require("chai").expect;
var sinon  = require("sinon");
var protobuf = require("protobufjs");
var executor = require("../src/executor");
var stepRegistry = require("../src/step-registry");


describe("Executing steps", function() {
  var executeStepMessage = null;
  var executeStepMessageFailing = null;
  var message = null;

  before( function(done) {
    var opts = { continueOnFailure: false };
    stepRegistry.add("Say {} to {}", "Say <hi> to <me>", function() {}, "executor-test.js", opts);
    stepRegistry.add("failing test", "failing test", function() {throw "Error";}, "executor-test.js", opts);
    sinon.spy(stepRegistry, "get");
    protobuf.load("gauge-proto/messages.proto").then(function(root){
      message = root.lookupType("gauge.messages.Message");
      executeStepMessage = message.create({
        messageId: 1,
        messageType: message.MessageType.ExecuteStep,
        executeStepRequest: {
          actualStepText: "Say \"hello\" to \"gauge\"",
          parsedStepText: "Say {} to {}",
          parameters: [
            { parameterType: 1, value: "hello", name: "", table: null },
            { parameterType: 1, value: "gauge", name: "", table: null }
          ]
        }
      });
      executeStepMessageFailing = message.create({
        messageId: 1,
        messageType: message.MessageType.ExecuteStep,
        executeStepRequest: {
          actualStepText: "failing test",
          parsedStepText: "failing test",
          parameters: []
        },
      });
      done();
    });
  });

  after( function(done) {
    stepRegistry.get.restore();
    done();
  });

  it("Should resolve promise when test function passes", function(done) {
    var promise = executor.step(executeStepMessage, message);
    promise.then(
      function(value) {
        expect(value.executionStatusResponse.executionResult.failed).to.equal(false);
        done();
      }
    ).done();
  });

  it("Should reject the promise when test function fails", function(done) {
    var promise = executor.step(executeStepMessageFailing, message);
    promise.then(
      function() {},
      function(reason) {
        expect(reason.executionStatusResponse.executionResult.failed).to.equal(true);
        done();
      }
    ).done();
  });

});
