Feature: gulp-test test suite

    Scenario: Loading gulp-test
        Given I have loaded component "gulp-test" with use case "dataDriven"
        Then the element "dummy" should have the text "TODO gulp-test contents here."
